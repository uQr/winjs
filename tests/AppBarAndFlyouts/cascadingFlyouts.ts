// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />

module CorsicaTests {
    "use strict";

    var _rootAnchor: HTMLElement;
    var cascadeManager = WinJS.UI.Flyout['_cascadeManager']; // TODO what's the right pattern for this (static) in TS?
    var chainCounter;

    var DEFAULT_CHAIN_SIZE = 4; // default

    function hideCascadingFlyout(flyout?: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Hides the specified flyout and returns a promise that completes when 
        // it and all of its subFlyouts in the cascade are hidden.
        // Verifies that focus returns to the element specified by fyout._previousFocus

        // Identify all the flyouts that should hide when the specified flyout is hidden.
        var index = cascadeManager.indexOf(flyout);
        index = (index < 0) ? 0 : index;

        var closingFlyouts: Array<WinJS.UI.Flyout> = cascadeManager._cascadingStack.slice(index, cascadeManager.length);

        var hidingPromises: Array<WinJS.Promise<any>> = closingFlyouts.map(function (flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
            return new WinJS.Promise(function (c, e, p) {
                function afterHide(): void {
                    flyout.removeEventListener("afterhide", afterHide, false);
                    LiveUnit.Assert.areEqual(-1, cascadeManager.indexOf(flyout), "hidden flyouts should be removed from the cascade");
                    c();
                };

                flyout.addEventListener("afterhide", afterHide, false);
            });
        });

        var p: WinJS.Promise<any> = WinJS.Promise.join(hidingPromises);

        closingFlyouts[0].hide();

        return p;
    }

    function expandChain(flyoutChain: Array<WinJS.UI.Flyout>, sentinelFlyout?: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Shows all flyouts in the specified flyoutChain until the sentinel flyout is shown.
        // If no sentinel is specified, the entire chain is shown.
        // Returns a promise that is completed when the last flyout is finished showing.

        var index: number = flyoutChain.indexOf(sentinelFlyout);
        flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

        var p: WinJS.Promise<any> = WinJS.Promise.wrap();
        flyoutChain.forEach(function (flyout: WinJS.UI.Flyout, index: number): void {
            p = p.then(function (): WinJS.Promise<any> {
                return OverlayHelpers.show(flyoutChain[index]);
            });
        });

        p.then(function validateFocusAfterChainExpansion() {
            var msg: string = "Expanding a chain of Flyouts should leave focus in final showing subFlyout.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.isTrue(flyoutChain[flyoutChain.length - 1].element.contains(<HTMLElement>document.activeElement), msg);
        });

        return p;
    }

    var generateFlyoutChain = function generateFlyoutChain(numFlyouts?: number, anchor?: HTMLElement): Array<WinJS.UI.Flyout> {
        // Creates and return an Array of Flyouts. Each Flyout in the chain has its anchor property set to the HTMLElement of the previous flyout.
        var flyoutChain = [],
            chainClass = "chain_" + ++chainCounter,
            prevFlyout;

        // Default fallbacks.
        numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;
        anchor = anchor || _rootAnchor;

        for (var i: number = 0; i < numFlyouts; i++) {
            anchor = prevFlyout ? prevFlyout.element : anchor;

            var flyout: WinJS.UI.Flyout = new WinJS.UI.Flyout(null, { anchor: anchor });
            document.body.appendChild(flyout.element);
            WinJS.Utilities.addClass(flyout.element, chainClass);
            flyout.element.id = (i + 1) + "of" + numFlyouts;

            flyoutChain.push(flyout);
            prevFlyout = flyout;
        }
        return flyoutChain;
    }

    export class CascadingFlyoutTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            chainCounter = 0;

            _rootAnchor = document.createElement('button');
            _rootAnchor.id = "rootanchor";
            _rootAnchor.textContent = "rootanchor";
            _rootAnchor.tabIndex = 1;
            document.body.appendChild(_rootAnchor);
            _rootAnchor.focus();
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            chainCounter = 0;
            cascadeManager.empty();

            var flyouts: NodeList = document.querySelectorAll(".win-flyout");
            Array.prototype.forEach.call(flyouts, function (element: HTMLElement): void {
                OverlayHelpers.disposeAndRemove(element);
                element = null;
            });

            OverlayHelpers.disposeAndRemove(_rootAnchor);
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        testSingleFlyoutInTheCascade = function (complete): void {
            // Verifies that showing and hiding a flyout will always add and remove it from the cascade.

            function checkAfterShow(): void {
                flyout.removeEventListener("aftershow", checkAfterShow, false);

                var msg: string = "Shown flyout should take focus";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), msg);

                msg = "Showing a flyout should always add it to the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isTrue(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 1);

                flyout.hide();
            };
            function checkAfterHide(): void {
                flyout.removeEventListener("afterhide", checkAfterHide, false);

                var msg: string = "Hiding a flyout should always remove it from the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isFalse(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 0)

                var msg: string = "Hiding all flyouts in the cascade should leave focus in the app.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), msg);

                complete();
            };

            var flyoutElement: HTMLElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout: WinJS.UI.Flyout = new WinJS.UI.Flyout(flyoutElement, { anchor: _rootAnchor });

            var msg: string = "The cascade should be empty when no flyouts are showing";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(cascadeManager.length, 0, msg);

            flyout.addEventListener("aftershow", checkAfterShow, false);
            flyout.addEventListener("afterhide", checkAfterHide, false);

            flyout.show();
        }

        testChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function (complete): void {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in the cascade.

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain();

            expandChain(flyoutChain).then(function (): void {
                var msg: string = "Each chained flyout that was shown should have been appended to the cascade in order";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadeManager.length, msg);
                for (var i: number = 0, len: number = flyoutChain.length; i < len; i++) {
                    LiveUnit.Assert.areEqual(flyoutChain[i], cascadeManager.getAt(i), msg);
                }

                msg = "There should be " + flyoutChain.length + " flyouts visible after cascading the entire flyout chain.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                var cascadingFlyouts: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement: HTMLElement): boolean {
                    return !flyoutElement.winControl.hidden;
                });
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadingFlyouts.length, msg);
                complete();
            });
        }

        testHidingAFlyoutCollapsesItsSubFlyoutsAndRestoresFocus = function (complete): void {
            // Verifies that hiding a flyout in the cascade  will close that flyout and removes all subflyouts after it from the stack.
            // Verifies  that focus is restored to whichever element the specified flyout originally took focus from.

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(),
                requiredSize: number = 3;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            expandChain(flyoutChain).then(function (): void {

                var flyoutToHide: WinJS.UI.Flyout = flyoutChain[requiredSize - 1],
                    expectedFocusTarget = flyoutToHide["_previousFocus"]; // TODO what's the right pattern for this in TS?

                hideCascadingFlyout(flyoutToHide).then(function () {
                    if (expectedFocusTarget) {
                        LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");
                    }

                    flyoutToHide = flyoutChain[Math.floor(flyoutChain.length / 2)];
                    expectedFocusTarget = flyoutToHide["_previousFocus"]; // TODO what's the right pattern for this in TS?
                })
                    .done(complete);
            });
        }

        testShowingAFlyout_AnchoredToAFlyoutInTheMiddleOfTheCascade_ClosesOtherSubFlyouts = function (complete) {
            // Verifies that, showing a flyout "A" whose anchor is an element contained within a flyout "B", while "B" is already showing in the cascade will:
            // 1) Removes all subflyouts after "B" from the cascasde, making "B" the new end.
            // 2) Appends "A" to the end of the cascade after "B".

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(),
                requiredSize: number = 2;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            expandChain(flyoutChain).then(function (): void {

                // Create a single Flyout anchored to a flyout already in the cascade
                var anchor: HTMLElement = flyoutChain[requiredSize - 1].element,
                    otherFlyout: WinJS.UI.Flyout = generateFlyoutChain(1, anchor)[0];

                OverlayHelpers.show(otherFlyout).then(function (): void {
                    var msg: string = "Showing a flyout (A), that is anchored to a flyout already in the cascade (B), should replace all subflyouts in the cascade following flyout (B) with flyout (A)";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);

                    var expectedCascade: Array<WinJS.UI.Flyout> = flyoutChain.slice(0, requiredSize).concat(otherFlyout);
                    LiveUnit.Assert.areEqual(expectedCascade.length, cascadeManager.length, msg);
                    for (var i: number = 0, len: number = expectedCascade.length; i < len; i++) {
                        LiveUnit.Assert.areEqual(expectedCascade[i], cascadeManager.getAt(i), msg);
                    }

                    var visibleFlyouts: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement: HTMLElement) {
                        return !flyoutElement.winControl.hidden;
                    });
                    expectedCascade.forEach(function (flyout: WinJS.UI.Flyout, index: number): void {
                        LiveUnit.Assert.areEqual(flyout.element, visibleFlyouts[index], msg);
                    });

                    msg = "There should be " + expectedCascade.length + " flyouts visible.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areEqual(expectedCascade.length, visibleFlyouts.length, msg);
                    complete();
                });
            });
        }

        testShowingAFlyout_NotAnchoredToAFlyoutInTheTheCascade_ReplacesTheCurrentCascadeWithItself = function (complete) {
            // Verifies that, 

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain();
            expandChain(flyoutChain).then(function (): void {

                // Create a single Flyout anchored to a button element in the <body>
                var otherFlyout: WinJS.UI.Flyout = generateFlyoutChain(1, _rootAnchor)[0];

                OverlayHelpers.show(otherFlyout).then(function (): void {
                    var msg: string = "Showing a flyout (A), that is not anchored to a flyout already in the cascade should replace all subflyouts in the cascade with flyout (A)";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areEqual(1, cascadeManager.length, msg);
                    LiveUnit.Assert.areEqual(0, cascadeManager.indexOf(otherFlyout), msg);

                    var visibleFlyouts: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement: HTMLElement) {
                        return !flyoutElement.winControl.hidden;
                    });

                    msg = "There should only be one flyout visible.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.areEqual(1, visibleFlyouts.length, msg);
                    LiveUnit.Assert.areEqual(otherFlyout.element, visibleFlyouts[0], msg);

                    msg = "Other flyout should have taken focus after showing.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isTrue(otherFlyout.element.contains(<HTMLElement>document.activeElement), msg);

                    complete();
                });
            });
        }

        xtestFocusIsManagedInTheCascade = function (complete) {
            // Verify that focus is always put in the tail flyout of the cascade whenever we hide or show flyouts.

            // Assert that the test expects at least 4 flyouts to be generated.

            // showPromise all 4 flyouts checking focus after each promise. 
            // hidePromise the last flyout, checking focus after the promise.
            // hidePromise the flyout @ index 1, verify only remaining flyout in the cascade has focus.

        }
    }
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.CascadingFlyoutTests");