// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />

module CorsicaTests {
    "use strict";

    var _Constants = Helper.require("WinJS/Controls/AppBar/_Constants"),
        Key = WinJS.Utilities.Key,
        Flyout = <typeof WinJS.UI.PrivateFlyout> WinJS.UI.Flyout,
        Menu = <typeof WinJS.UI.PrivateMenu> WinJS.UI.Menu,
        MenuCommand = <typeof WinJS.UI.PrivateMenuCommand> WinJS.UI.MenuCommand,
        _rootAnchor: HTMLElement,
        cascadeManager = Flyout._cascadeManager,
        chainCounter;

    var DEFAULT_CHAIN_SIZE = 6;

    export class _BaseCascadingTests {
        private abstractMethodFail() {
            LiveUnit.Assert.fail("Test Error: This method is abstract. Descendant classes need to provide implementation.");
        }

        showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            return WinJS.Promise.wrapError(this.abstractMethodFail());
        }

        hideFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            // Hides the specified flyout and returns a promise that completes when
            // it and all of its subFlyouts in the cascade are hidden.

            var p: WinJS.Promise<any>;

            var index = cascadeManager.indexOf(flyout);
            if (index >= 0) {
                // Identify all the subFlyouts that should hide when the specified flyout is hidden.
                var hidingFlyouts: Array<WinJS.UI.PrivateFlyout> = cascadeManager._cascadingStack.slice(index, cascadeManager.length);

                var hidingPromises: Array<WinJS.Promise<any>> = hidingFlyouts.map((flyout): WinJS.Promise<any> => {
                    return new WinJS.Promise((c, e, p) => {
                        function afterHide() {
                            flyout.removeEventListener("afterhide", afterHide, false);
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

        showFlyoutChain(flyoutChain: Array<WinJS.UI.PrivateFlyout>, sentinelFlyout?: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            // Shows all flyouts in the specified flyoutChain until the sentinel flyout is shown.
            // If no sentinel is specified, the entire chain is shown.
            // Returns a promise that is completed when the last flyout is finished showing.

            var that = this,
                index = flyoutChain.indexOf(sentinelFlyout);
            flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

            var p = WinJS.Promise.wrap();
            flyoutChain.forEach((flyout, index: number) => {
                p = p.then((): WinJS.Promise<any> => {
                    return that.showFlyout(flyoutChain[index]);
                });
            });

            return p;
        }

        generateFlyoutChain(anchor?: HTMLElement, numFlyouts?: number): Array<WinJS.UI.PrivateFlyout> {
            this.abstractMethodFail();
            return [];
        }

        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            this.abstractMethodFail();
        }

        verifyCascade(expectedCascade: Array<WinJS.UI.PrivateFlyout>): void {
            // Verifies that the Flyouts currently in the cascade and the Flyouts that are currently visible line up with the chain of flyouts we are expecting.
            var msg = "The Flyouts in the cascade should match the chain of Flyouts we were expecting.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(expectedCascade.length, cascadeManager.length, msg);
            for (var i = 0, len = expectedCascade.length; i < len; i++) {
                LiveUnit.Assert.areEqual(expectedCascade[i], cascadeManager.getAt(i), msg);
            }

            msg = "The Flyouts that are visible should match the chain of Flyouts we were expecting.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            var visibleFlyoutElements: Array<HTMLElement> = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement) {
                return !flyoutElement.winControl.hidden;
            });
            LiveUnit.Assert.areEqual(expectedCascade.length, visibleFlyoutElements.length, msg);
            for (var i = 0, len = expectedCascade.length; i < len; i++) {
                LiveUnit.Assert.isTrue(visibleFlyoutElements.indexOf(expectedCascade[i].element) >= 0, msg);
            }
        }

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
            cascadeManager.collapseAll();

            var flyouts = document.querySelectorAll(".win-flyout");
            Array.prototype.forEach.call(flyouts, (element: HTMLElement) => {
                OverlayHelpers.disposeAndRemove(element);
                element = null;
            });

            OverlayHelpers.disposeAndRemove(_rootAnchor);
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        testSingleFlyoutInTheCascade = function (complete) {
            // Verifies that showing and hiding a flyout will always add and remove it from the cascade.

            function checkAfterShow() {
                flyout.removeEventListener("aftershow", checkAfterShow, false);

                var msg = "Shown flyout should take focus";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), msg);

                msg = "Showing a flyout should always add it to the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isTrue(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 1);

                flyout.hide();
            };
            function checkAfterHide() {
                flyout.removeEventListener("afterhide", checkAfterHide, false);

                var msg = "Hiding a flyout should always remove it from the cascade";
                LiveUnit.LoggingCore.logComment("Test: " + msg);

                LiveUnit.Assert.isFalse(cascadeManager.indexOf(flyout) >= 0, msg);
                LiveUnit.Assert.areEqual(cascadeManager.length, 0)

                var msg = "Hiding all flyouts in the cascade should leave focus in the app.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), msg);

                complete();
            };

            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new Flyout(flyoutElement, { anchor: _rootAnchor });

            var msg = "The cascade should be empty when no flyouts are showing";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(cascadeManager.length, 0, msg);

            flyout.addEventListener("aftershow", checkAfterShow, false);
            flyout.addEventListener("afterhide", checkAfterHide, false);

            flyout.show();
        }

        testChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function (complete) {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in the cascade, in order.

            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);

            that.showFlyoutChain(flyoutChain).then(() => {
                that.verifyCascade(flyoutChain);
                complete();
            });
        }

        testHidingAFlyoutAlsoCollapsesItsSubFlyoutsAndRestoresFocus = function (complete) {
            // Verifies that hiding a flyout will also hide its cascading subFlyouts.
            // Verifies that each time a flyout is hidden, focus is restored to whichever element the specified flyout originally took focus from.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            var that = this,
                requiredSize = 3,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            var index: number,
                flyout: WinJS.UI.PrivateFlyout,
                expectedFocusTarget: HTMLElement,
                expectedCascadeAfterHiding: Array<WinJS.UI.PrivateFlyout>;

            return that.showFlyoutChain(flyoutChain).then(() => {

                // Hide Flyout at the end of the cascade
                index = flyoutChain.length - 1;
                flyout = flyoutChain[index];
                expectedFocusTarget = flyout._previousFocus,
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return that.hideFlyout(flyout);

            }).then(() => {
                    that.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout in the middle of the cascade
                    index = Math.floor(flyoutChain.length / 2)
                flyout = flyoutChain[index];
                    expectedFocusTarget = flyout._previousFocus;
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return that.hideFlyout(flyout);

                }).then(() => {
                    that.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout at the beginning of the cascade
                    index = 0;
                    flyout = flyoutChain[index];
                    expectedFocusTarget = _rootAnchor;
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return that.hideFlyout(flyout);

                }).then(() => {
                    that.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    complete();
                });
        }

        testShowingAFlyout_AnchoredToAFlyoutInTheMiddleOfTheCascade_HidesOtherSubFlyouts = function (complete) {
            // Verifies that, showing a flyout "A" whose anchor is an element contained within a flyout "B", while "B" is already showing in the cascade will:
            // 1) Removes all subflyouts after "B" from the cascade, making "B" the new end.
            // 2) Appends "A" to the end of the cascade after "B".

            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor),
                requiredSize = 2;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            that.showFlyoutChain(flyoutChain).then(() => {

                // Create a single Flyout anchored to a flyout already in the cascade.
                var otherFlyout = that.generateFlyoutChain(null, 1)[0];
                that.chainFlyouts(flyoutChain[requiredSize - 2], otherFlyout);

                that.showFlyout(otherFlyout).then(() => {
                    var expectedCascade = flyoutChain.slice(0, requiredSize - 1).concat(otherFlyout);
                    that.verifyCascade(expectedCascade);
                    complete();
                });
            });
        }

        testShowingAFlyout_NotAnchoredToAFlyoutInTheTheCascade_ReplacesTheCurrentCascadeWithItself = function (complete) {
            // Verifies that, showing a flyout (A), that is not anchored to a flyout already in the cascade should replace all subflyouts in the cascade with flyout (A).
            // Also Verifies that then hiding (A) will restore focus back to the element in the App that had focus before the any of the flyouts were opened.

            // Explicitly set initial focus:
            _rootAnchor.focus();

            // Chain of flyouts to initially show in the cascade.
            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);

            // Single flyout anchored to the <body>
            var otherFlyout = that.generateFlyoutChain(document.body, 1)[0];

            that.showFlyoutChain(flyoutChain).then(() => {
                return that.showFlyout(otherFlyout);
            }).then(() => {
                    that.verifyCascade([otherFlyout]);
                    return that.hideFlyout(otherFlyout);
                }).done(() => {
                    LiveUnit.Assert.isTrue(_rootAnchor.contains(<HTMLElement>document.activeElement), "Hiding all flyouts in the cascade should return focus to the element that originally had it.");
                    complete();
                });
        }

        testFlyoutAlwaysHidesSubFlyoutsWhenItReceivesFocus = function (complete) {
            // Verifies that when focus moves into a flyout from somewhere that was outside of that flyout, all of it's subflyout descendants  get removed from the cascade.

            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor),
                requiredSize = 3;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            that.showFlyoutChain(flyoutChain).then(() => {
                var index = 1,
                    flyoutToFocus = flyoutChain[index],
                    firstSubFlyoutToHide = flyoutChain[index + 1],
                    expectedChain = flyoutChain.slice(0, index + 1);

                firstSubFlyoutToHide.addEventListener("afterhide", function afterHide() {
                    firstSubFlyoutToHide.removeEventListener, ("afterhide", afterHide, false);
                    that.verifyCascade(expectedChain);
                    complete();
                }.bind(this), false);

                LiveUnit.Assert.isFalse(flyoutToFocus.element.contains(<HTMLElement>document.activeElement),
                    "Test Error: focus needs to be outside of the element, before we focus it.");
                flyoutToFocus.element.focus();
            });

        }

        testEntireCascadeHidesWhenAllFlyoutsLoseFocus = function (complete) {
            // Verifies that the entire cascade hides when all flyouts lose focus.

            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);
            that.showFlyoutChain(flyoutChain).then(() => {

                flyoutChain[0].addEventListener("afterhide", function afterHide() {
                    flyoutChain[0].removeEventListener("afterhide", afterHide, false);
                    that.verifyCascade([]);
                    complete();
                }.bind(this), false);

                LiveUnit.Assert.isTrue(cascadeManager.indexOfElement(document.activeElement) >= 0,
                    "Test Error: focus needs to be inside of one of the flyouts in the cascade before we move focus outside of the cascade.");
                _rootAnchor.focus();
            });

        }

        testLeftArrowKeyHidesCurrentSubFlyout = function (complete) {
            // Verifies that the left arrow key will hide any flyout that is a subFlyout.
            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);
            that.showFlyoutChain(flyoutChain).then(() => {

                var endFlyout = flyoutChain[flyoutChain.length - 1],
                    expectedCascade = flyoutChain.slice(0, flyoutChain.length - 1);

                endFlyout.addEventListener("afterhide", function afterHide() {
                    endFlyout.removeEventListener, ("afterhide", afterHide, false);
                    that.verifyCascade(expectedCascade);
                    complete();
                }.bind(this), false);

                Helper.keydown(endFlyout.element, Key.leftArrow);
            });
        }

        testLeftArrowKeyDoesNotHideFlyoutWhenOnlyOneFlyoutIsShowing = function (complete) {
            // Verifies that the left arrow key will not hide a Flyout, if that Flyout is not a subFlyout of another shown flyout.
            var that = this,
                flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new Flyout(flyoutElement, { anchor: _rootAnchor });
            var msg = "Left arrow key should not hide the current flyout if it is not the subFlyout of another shown flyout.";

            function beforeHide() {
                flyout.removeEventListener("beforehide", beforeHide, false);
                LiveUnit.Assert.fail(msg);
            }

            that.showFlyout(flyout).then(() => {

                that.verifyCascade([flyout]);

                LiveUnit.LoggingCore.logComment("Test: " + msg);
                flyout.addEventListener("beforehide", beforeHide, false);
                Helper.keydown(flyout.element, Key.leftArrow);

                return WinJS.Promise.timeout();
            }).then(function () {
                    flyout.removeEventListener("beforehide", beforeHide, false);
                    complete();
                });
        }

        testAltAndF10WillCollapseTheEntireCascade = function (complete) {
            // Verifies that both "alt" and "F10" keys when pressed inside a flyout will collapse the entire cascade.
            var that = this,
                flyoutChain = that.generateFlyoutChain(_rootAnchor);

            function verifyKeyCollapsesTheCascade(keyCode: number, keyName: string) {
                return new WinJS.Promise((completePromise) => {
                    that.showFlyoutChain(flyoutChain).then(() => {

                        var headFlyout = flyoutChain[0],
                            tailFlyout = flyoutChain[flyoutChain.length - 1];

                        headFlyout.addEventListener("afterhide", function afterHide() {
                            headFlyout.removeEventListener, ("afterhide", afterHide, false);
                            that.verifyCascade([]);
                            completePromise();
                        }, false);

                        var msg = "The entire cascade should hide whenever " + keyName + " is pressed inside a Flyout";
                        LiveUnit.LoggingCore.logComment("Test: " + msg);
                        Helper.keydown(tailFlyout.element, keyCode);
                    });
                });
            };

            verifyKeyCollapsesTheCascade(Key.alt, "alt").then(() => {
                return verifyKeyCollapsesTheCascade(Key.F10, "F10");
            }).done(complete);
        }
    }

    export class CascadingFlyoutTests extends _BaseCascadingTests {
        showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            return OverlayHelpers.show(flyout).then(function verifyFlyoutContainsFocusAfterShowing() {
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), "Flyout should contain focus after showing");
            });
        }

        generateFlyoutChain(anchor?: HTMLElement, numFlyouts?: number): Array<WinJS.UI.PrivateFlyout> {
            // Creates and returns an Array of Flyouts. Each Flyout in the chain has its anchor property set to the HTMLElement of the previous flyout.
            var flyoutChain = [],
                chainClass = "chain_" + ++chainCounter,
                prevFlyout;

            // Default fallback.
            numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;

            for (var i = 0; i < numFlyouts; i++) {
                anchor = prevFlyout ? prevFlyout.element : anchor;

                var flyout = new Flyout(null, { anchor: anchor });
                document.body.appendChild(flyout.element);
                WinJS.Utilities.addClass(flyout.element, chainClass);
                flyout.element.id = (i + 1) + "of" + numFlyouts;

                flyoutChain.push(flyout);
                prevFlyout = flyout;
            }
            return flyoutChain;
        }

        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            // Chain the tail Flyout to the head Flyout.
            tail.anchor = head.element;
        }
    }

    export class CascadingMenuTests extends _BaseCascadingTests {
        private firstCommandId = "flyoutCmd1";
        private secondCommandId = "flyoutCmd2";

        showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            // If my anchor isn't in the cascade, just call overlayhelpers.show
            // else call menucommand._activateFlyoutCommand(flyout)

            var cascadingStack = cascadeManager._cascadingStack;
            for (var cascadeIndex = cascadingStack.length - 1; cascadeIndex >= 0; cascadeIndex--) {

                var currentFlyout = cascadingStack[cascadeIndex],
                    currentFlyoutCommands = currentFlyout.element.querySelectorAll("." + _Constants.menuCommandFlyoutClass),
                    parentFlyoutCommand;

                for (var i = 0, len = currentFlyoutCommands.length; i < len; i++) {
                    var flyoutCommand = currentFlyoutCommands[i].winControl;
                    if (flyoutCommand && flyoutCommand.flyout === flyout) {
                        parentFlyoutCommand = flyoutCommand;
                    }
                }

                if (parentFlyoutCommand) {
                    break;
                }
            }

            var result;
            if (parentFlyoutCommand) {
                result = MenuCommand._activateFlyoutCommand(parentFlyoutCommand);
            } else {
                result = OverlayHelpers.show(flyout);
            }

            return result.then(function verifyFlyoutContainsFocusAfterShowing() {
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), "Flyout should contain focus after showing");
            });
        }

        generateFlyoutChain(anchor?: HTMLElement, numMenus?: number): Array<WinJS.UI.PrivateFlyout> {
            // Creates and returns an Array of Menu Flyouts. Each Menu in the chain has its anchor property set to the HTMLElement of parent Menu's flyout MenuCommand
            var flyoutChain = [],
                chainClass = "chain_" + ++chainCounter,
                prevMenu;

            // Default fallback.
            numMenus = numMenus || DEFAULT_CHAIN_SIZE;

            for (var i = 0; i < numMenus; i++) {

                var menu = new Menu(null, {});
                document.body.appendChild(menu.element);
                WinJS.Utilities.addClass(menu.element, chainClass);
                menu.element.id = (i + 1) + "of" + numMenus;

                if (prevMenu) {
                    // Set commands in the previous Menu in order to chain it to the current Menu, via the MenuCommand 'flyout' property.
                    var prevMenuCommands = [
                        // First command opens the current Menu. 
                        // Second command can be used by tests for any reason.
                        new MenuCommand(null, { id: this.firstCommandId, label: this.firstCommandId, type: _Constants.typeFlyout, flyout: menu }),
                        new MenuCommand(null, { id: this.secondCommandId, label: this.secondCommandId, type: _Constants.typeFlyout, flyout: null }),
                    ];
                    prevMenu.commands = prevMenuCommands;
                    menu.anchor = prevMenuCommands[0].element;
                } else {
                    menu.anchor = anchor
                }

                flyoutChain.push(menu);
                prevMenu = menu;
            }
            return flyoutChain;
        }

        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            // Chain the tail Menu to the head Menu.
            var menuCommand = head.element.querySelector("#" + this.secondCommandId).winControl;
            menuCommand.flyout = tail;
        }
    }
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.CascadingFlyoutTests");
LiveUnit.registerTestClass("CorsicaTests.CascadingMenuTests");