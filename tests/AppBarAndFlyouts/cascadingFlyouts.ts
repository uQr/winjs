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


    function showFlyout(flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
        return OverlayHelpers.show(flyout).then(function verifyFlyoutContainsFocusAfterShowing() {
            LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), "Flyout should contain focus after showing");
        });
    }

    function hideFlyout(flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Hides the specified flyout and returns a promise that completes when 
        // it and all of its subFlyouts in the cascade are hidden.

        var p: WinJS.Promise<any>;

        // Identify all the flyouts that should hide when the specified flyout is hidden.
        var index = cascadeManager.indexOf(flyout);
        if (index >= 0) {

            var hidingFlyouts: Array<WinJS.UI.Flyout> = cascadeManager._cascadingStack.slice(index, cascadeManager.length);

            var hidingPromises: Array<WinJS.Promise<any>> = hidingFlyouts.map(function (flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
                return new WinJS.Promise(function (c, e, p) {
                    function afterHide(): void {
                        flyout.removeEventListener("afterhide", afterHide, false);
                        //LiveUnit.Assert.areEqual(-1, cascadeManager.indexOf(flyout), "hidden flyouts should be removed from the cascade");
                        c();
                    };

                    flyout.addEventListener("afterhide", afterHide, false);
                });
            });
            hidingFlyouts[0].hide();
            p = WinJS.Promise.join(hidingPromises);
        } else {
            p = WinJS.Promise.wrap();
        }

        return p;
    }

    function showFlyoutChain(flyoutChain: Array<WinJS.UI.Flyout>, sentinelFlyout?: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Shows all flyouts in the specified flyoutChain until the sentinel flyout is shown.
        // If no sentinel is specified, the entire chain is shown.
        // Returns a promise that is completed when the last flyout is finished showing.

        var index: number = flyoutChain.indexOf(sentinelFlyout);
        flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

        var p: WinJS.Promise<any> = WinJS.Promise.wrap();
        flyoutChain.forEach(function (flyout: WinJS.UI.Flyout, index: number): void {
            p = p.then(function (): WinJS.Promise<any> {
                return showFlyout(flyoutChain[index]);
            });
        });

        return p;
    }

    var generateFlyoutChain = function generateFlyoutChain(anchor: HTMLElement, numFlyouts?: number): Array<WinJS.UI.Flyout> {
        // Creates and return an Array of Flyouts. Each Flyout in the chain has its anchor property set to the HTMLElement of the previous flyout.
        var flyoutChain = [],
            chainClass = "chain_" + ++chainCounter,
            prevFlyout;

        // Default fallbacks.
        numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;

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

    function verifyCascade(expectedCascade: Array<WinJS.UI.Flyout>): void {
        // Verifies that the Flyouts currently in the cascade and the Flyouts that are currently visible line up with the chain of flyouts we are expecting.
        var msg: string = "The Flyouts in the cascade should match the chain of Flyouts we were expecting.";
        LiveUnit.LoggingCore.logComment("Test: " + msg);
        LiveUnit.Assert.areEqual(expectedCascade.length, cascadeManager.length, msg);
        for (var i: number = 0, len: number = expectedCascade.length; i < len; i++) {
            LiveUnit.Assert.areEqual(expectedCascade[i], cascadeManager.getAt(i), msg);
        }

        msg = "The Flyouts that are visible should match the chain of Flyouts we were expecting.";
        LiveUnit.LoggingCore.logComment("Test: " + msg);
        var visibleFlyoutElements: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement: HTMLElement): boolean {
            return !flyoutElement.winControl.hidden;
        });
        LiveUnit.Assert.areEqual(expectedCascade.length, visibleFlyoutElements.length, msg);
        for (var i: number = 0, len: number = expectedCascade.length; i < len; i++) {
            LiveUnit.Assert.isTrue(visibleFlyoutElements.indexOf(expectedCascade[i].element) >= 0, msg);
        }
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
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in the cascade, in order.

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(_rootAnchor);

            showFlyoutChain(flyoutChain).then(function (): void {
                verifyCascade(flyoutChain);
                complete();
            });
        }

        testHidingAFlyoutAlsoCollapsesItsSubFlyoutsAndRestoresFocus = function (complete) {
            // Verifies that hiding various flyouts in the cascade will hide that flyout and removes all subflyouts after it from the stack.
            // Verifies that each time a flyout is hidden, focus is restored to whichever element the specified flyout originally took focus from.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            var requiredSize: number = 3,
                flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(_rootAnchor);
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            var index: number,
                flyout: WinJS.UI.Flyout,
                expectedFocusTarget: HTMLElement,
                expectedCascadeAfterHiding: Array<WinJS.UI.Flyout>;


            return showFlyoutChain(flyoutChain).then(function () {

                // Hide Flyout at the end of the cascade
                index = flyoutChain.length - 1;
                flyout = flyoutChain[index];
                expectedFocusTarget = flyout["_previousFocus"]; // TODO what's the right pattern for this in TS?
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return hideFlyout(flyout);

            }).then(function () {
                    verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout in the niddle of the cascade
                    index = Math.floor(flyoutChain.length / 2)
                    flyout = flyoutChain[index];
                    expectedFocusTarget = flyout["_previousFocus"]; // TODO what's the right pattern for this in TS?
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return hideFlyout(flyout);

                }).then(function () {
                    verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout at the beginning of the cascade
                    index = 0;
                    flyout = flyoutChain[index];
                    expectedFocusTarget = _rootAnchor;
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return hideFlyout(flyout);

                }).then(function () {
                    verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    complete();
                });
        }

        testShowingAFlyout_AnchoredToAFlyoutInTheMiddleOfTheCascade_HidesOtherSubFlyouts = function (complete) {
            // Verifies that, showing a flyout "A" whose anchor is an element contained within a flyout "B", while "B" is already showing in the cascade will:
            // 1) Removes all subflyouts after "B" from the cascasde, making "B" the new end.
            // 2) Appends "A" to the end of the cascade after "B".

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(_rootAnchor),
                requiredSize: number = 2;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            showFlyoutChain(flyoutChain).then(function (): void {

                // Create a single Flyout anchored to a flyout already in the cascade
                var anchor: HTMLElement = flyoutChain[requiredSize - 1].element,
                    otherFlyout: WinJS.UI.Flyout = generateFlyoutChain(anchor, 1)[0];

                showFlyout(otherFlyout).then(function (): void {
                    var expectedCascade: Array<WinJS.UI.Flyout> = flyoutChain.slice(0, requiredSize).concat(otherFlyout);
                    verifyCascade(expectedCascade);
                    complete();
                });
            });
        }

        testShowingAFlyout_NotAnchoredToAFlyoutInTheTheCascade_ReplacesTheCurrentCascadeWithItself = function (complete) {
            // Verifies that, showing a flyout (A), that is not anchored to a flyout already in the cascade should replace all subflyouts in the cascade with flyout (A).
            // Also Verifies that, then hiding (A) will then restore focus back to the element in the App that had focus before the any of the flyouts were opened.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            // Chain of flyouts to initially show in the cascade.
            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain(_rootAnchor);

            // Single flyout anchored to the <body>
            var otherFlyout: WinJS.UI.Flyout = generateFlyoutChain(document.body, 1)[0];

            showFlyoutChain(flyoutChain).then(function () {
                return showFlyout(otherFlyout);
            }).then(function () {
                    verifyCascade([otherFlyout]);
                    return hideFlyout(otherFlyout);
                }).done(function () {
                    LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), "Hiding all flyouts in the cascade should return focus to the element that originall had it.");
                    complete();
                });
        }

        xtestFlyoutAlwaysHidesSubFlyoutsWhenItReceivesFocus = function (complete) {
        }

        xtestEntireCascadeHidesWhenAllFlyoutsLoseFocus = function (complete) {
        }

        xtestLeftArrowKeyHidesCurrentSubFlyout = function (complete) {
        }

        xtestLeftArrowKeyDoesNotHideWhenOnlyOneFlyoutIsShowing = function (complete) {
        }


    }
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.CascadingFlyoutTests");