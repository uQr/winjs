// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />
/// <deploy src="../TestData/" />

module CorsicaTests {
    "use strict";

    var _Constants = Helper.require("WinJS/Controls/_LegacyAppBar/_Constants"),
        _LightDismissService = Helper.require("WinJS/_LightDismissService"),
        Key = WinJS.Utilities.Key,
        Flyout = <typeof WinJS.UI.PrivateFlyout> WinJS.UI.Flyout,
        Menu = <typeof WinJS.UI.PrivateMenu> WinJS.UI.Menu,
        MenuCommand = <typeof WinJS.UI.PrivateMenuCommand> WinJS.UI.MenuCommand,
        _defaultAnchor: HTMLElement,
        cascadeManager = Flyout._cascadeManager,
        chainCounter;

    var DEFAULT_CHAIN_SIZE = 6;

    var listenOnce = (flyout: WinJS.UI.PrivateFlyout, eventName: string, callback: () => any): void => {
        flyout.addEventListener(eventName, function handler() {
            flyout.removeEventListener(eventName, handler, false);
            callback();
        }, false);
    };

    // Private test class provides Helpers and tests that every implementing test class will need.
    export class _BaseCascadingTests {
        private abstractMethodFail() {
            LiveUnit.Assert.fail("Test Error: This method is abstract. Descendant classes need to provide implementation.");
        }

        //
        // Abstract Helper methods that need to be implemented by each derivative class.
        //

        showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            this.abstractMethodFail();
            return WinJS.Promise.wrapError(null); // Appease the compiler.
        }

        generateFlyoutChain(numFlyouts?: number): Array<WinJS.UI.PrivateFlyout> {
            this.abstractMethodFail();
            return []; // Appease the compiler.
        }

        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            this.abstractMethodFail();
        }

        //
        // Concrete Helper methods
        //

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

            var verifyFlyoutContainsFocusAfterShowing = (flyout: WinJS.UI.PrivateFlyout) => {
                LiveUnit.Assert.isTrue(flyout.element.contains(<HTMLElement>document.activeElement), "Flyout should contain focus after showing");
            }

            var index = flyoutChain.indexOf(sentinelFlyout);
            flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

            return Helper.Promise.forEach(flyoutChain, (flyout) => {
                return this.showFlyout(flyout).then(() => {
                    verifyFlyoutContainsFocusAfterShowing(flyout);
                });
            });
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

        verifyDismissableLayer(expectedDismissables: WinJS.UI.PrivateFlyout[]): void {
            var dismissableLayer = cascadeManager.dismissableLayer;
            var dismissableFlyouts = dismissableLayer.clients.map(function (client) {
                return client.element.winControl;
            });
            if (expectedDismissables.length === 0) {
                LiveUnit.Assert.isFalse(_LightDismissService.isShown(dismissableLayer),
                    "CascadingManager's dismissable layer is empty and should not be shown.");
            } else {
                LiveUnit.Assert.isTrue(_LightDismissService.isShown(dismissableLayer),
                    "CascadingManager's dismissable layer is non-empty and should be shown.");
            }
            Helper.Assert.areArraysEqual(expectedDismissables, dismissableFlyouts,
                "Unexpected set of Flyouts in dismissable layer");
        }

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            chainCounter = 0;

            _defaultAnchor = document.createElement('button');
            _defaultAnchor.id = "defaultanchor";
            _defaultAnchor.textContent = "defaultanchor";
            _defaultAnchor.tabIndex = 1;
            document.body.appendChild(_defaultAnchor);
            _defaultAnchor.focus();
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

            OverlayHelpers.disposeAndRemove(_defaultAnchor);
        }

        //
        // Unit Tests
        //

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
                LiveUnit.Assert.isTrue(_defaultAnchor.contains(<HTMLElement>document.activeElement), msg);

                complete();
            };

            var flyout = this.generateFlyoutChain(1)[0];

            var msg = "The cascade should be empty when no flyouts are showing";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(cascadeManager.length, 0, msg);

            flyout.addEventListener("aftershow", checkAfterShow, false);
            flyout.addEventListener("afterhide", checkAfterHide, false);

            flyout.show();
        }

        testChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function (complete) {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in the cascade, in order.

            var flyoutChain = this.generateFlyoutChain();

            this.showFlyoutChain(flyoutChain).then(() => {
                this.verifyCascade(flyoutChain);
                complete();
            });
        }

        testHidingAFlyoutAlsoCollapsesItsSubFlyoutsAndRestoresFocus = function (complete) {
            // Verifies that hiding a flyout will also hide its cascading subFlyouts.
            // Verifies that each time a flyout is hidden, focus is restored to whichever element the specified flyout originally took focus from.

            // Explicitly set initial focus:
            _defaultAnchor.focus();

            var requiredSize = 3,
                flyoutChain = this.generateFlyoutChain();
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            var index: number,
                flyout: WinJS.UI.PrivateFlyout,
                expectedFocusTarget: HTMLElement,
                expectedCascadeAfterHiding: Array<WinJS.UI.PrivateFlyout>;

            return this.showFlyoutChain(flyoutChain).then(() => {

                // Hide Flyout at the end of the cascade
                index = flyoutChain.length - 1;
                flyout = flyoutChain[index];
                expectedFocusTarget = flyoutChain[index - 1].element,
                expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                return this.hideFlyout(flyout);

            }).then(() => {
                    this.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout in the middle of the cascade
                    index = Math.floor(flyoutChain.length / 2)
                    flyout = flyoutChain[index];
                    expectedFocusTarget = flyoutChain[index - 1].element;
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return this.hideFlyout(flyout);

                }).then(() => {
                    this.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    // Hide Flyout at the beginning of the cascade
                    index = 0;
                    flyout = flyoutChain[index];
                    expectedFocusTarget = _defaultAnchor;
                    expectedCascadeAfterHiding = flyoutChain.slice(0, index);
                    return this.hideFlyout(flyout);

                }).then(() => {
                    this.verifyCascade(expectedCascadeAfterHiding);
                    LiveUnit.Assert.areEqual(document.activeElement, expectedFocusTarget, "The flyout specified to hide should have put focus on whatever element it had originally taken it from.");

                    complete();
                });
        }

        testShowingAFlyout_AnchoredToAFlyoutInTheMiddleOfTheCascade_HidesOtherSubFlyouts = function (complete) {
            // Verifies that, showing a flyout "A" whose anchor is an element contained within a flyout "B", while "B" is already showing in the cascade will:
            // 1) Removes all subflyouts after "B" from the cascade, making "B" the new end.
            // 2) Appends "A" to the end of the cascade after "B".

            var flyoutChain = this.generateFlyoutChain(),
                requiredSize = 2;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            this.showFlyoutChain(flyoutChain).then(() => {

                // Create a single Flyout and chain it to a flyout in the middle of the cascade.
                var otherFlyout = this.generateFlyoutChain(1)[0];
                this.chainFlyouts(flyoutChain[requiredSize - 2], otherFlyout);

                this.showFlyout(otherFlyout).then(() => {
                    var expectedCascade = flyoutChain.slice(0, requiredSize - 1).concat(otherFlyout);
                    this.verifyCascade(expectedCascade);
                    complete();
                });
            });
        }

        testShowingAFlyout_NotAnchoredToAFlyoutInTheTheCascade_ReplacesTheCurrentCascadeWithItself = function (complete) {
            // Verifies that, showing a flyout (A), that is not anchored to a flyout already in the cascade should replace all subflyouts in the cascade with flyout (A).
            // Also Verifies that then hiding (A) will restore focus back to the element in the App that had focus before the any of the flyouts were opened.

            // Explicitly set initial focus:
            _defaultAnchor.focus();

            // Chain of flyouts to initially show in the cascade.
            var flyoutChain = this.generateFlyoutChain();

            // Single flyout from a new chain.
            var otherFlyout = this.generateFlyoutChain(1)[0];

            this.showFlyoutChain(flyoutChain).then(() => {
                return this.showFlyout(otherFlyout);
            }).then(() => {
                    this.verifyCascade([otherFlyout]);
                    return this.hideFlyout(otherFlyout);
                }).done(() => {
                    LiveUnit.Assert.isTrue(_defaultAnchor.contains(<HTMLElement>document.activeElement), "Hiding all flyouts in the cascade should return focus to the element that originally had it.");
                    complete();
                });
        }

        testFlyoutAlwaysHidesSubFlyoutsWhenItReceivesFocus = function (complete) {
            // Verifies that when focus moves into a flyout from somewhere that was outside of that flyout, all of it's subflyout descendants get removed from the cascade.

            var flyoutChain = this.generateFlyoutChain(),
                requiredSize = 3;
            LiveUnit.Assert.isTrue(flyoutChain.length >= requiredSize, "ERROR: Test requires input size of at least " + requiredSize);

            this.showFlyoutChain(flyoutChain).then(() => {
                var index = 1,
                    flyoutToFocus = flyoutChain[index],
                    firstSubFlyoutToHide = flyoutChain[index + 1],
                    expectedChain = flyoutChain.slice(0, index + 1);

                listenOnce(firstSubFlyoutToHide, "afterhide", () => {
                    this.verifyCascade(expectedChain);
                    complete();
                });

                LiveUnit.Assert.isFalse(flyoutToFocus.element.contains(<HTMLElement>document.activeElement),
                    "Test Error: focus needs to be outside of the element, before we focus it.");
                flyoutToFocus.element.focus();
            });

        }

        testEntireCascadeHidesWhenAllFlyoutsLoseFocus = function (complete) {
            // Verifies that the entire cascade hides when all flyouts lose focus.

            var flyoutChain = this.generateFlyoutChain();
            this.showFlyoutChain(flyoutChain).then(() => {

                listenOnce(flyoutChain[0], "afterhide", () => {
                    this.verifyCascade([]);
                    complete();
                });

                LiveUnit.Assert.isTrue(cascadeManager.indexOfElement(document.activeElement) >= 0,
                    "Test Error: focus needs to be inside of one of the flyouts in the cascade before we move focus outside of the cascade.");
                _defaultAnchor.focus();
            });

        }

        testDisposeOfCascade = function (complete) {
            // Verifies cascade cleans up properly when each of its flyouts gets disposed.

            var flyoutChain = this.generateFlyoutChain();
            this.showFlyoutChain(flyoutChain).then(() => {
                this.verifyDismissableLayer(flyoutChain);
                flyoutChain.forEach((flyout) => {
                    flyout.dispose();
                });
                this.verifyCascade([]);
                this.verifyDismissableLayer([]);
                complete();
            });

        }

        testLeftArrowKeyHidesCurrentSubFlyout = function (complete) {
            // Verifies that the left arrow key will hide any flyout that is a subFlyout.
            var flyoutChain = this.generateFlyoutChain();
            this.showFlyoutChain(flyoutChain).then(() => {

                var endFlyout = flyoutChain[flyoutChain.length - 1],
                    expectedCascade = flyoutChain.slice(0, flyoutChain.length - 1);

                listenOnce(endFlyout, "afterhide", () => {
                    this.verifyCascade(expectedCascade);
                    complete();
                });

                Helper.keydown(endFlyout.element, Key.leftArrow);
            });
        }

        testLeftArrowKeyDoesNotHideFlyoutWhenOnlyOneFlyoutIsShowing = function (complete) {
            // Verifies that the left arrow key will not hide a Flyout, if that Flyout is not a subFlyout of another shown flyout.
            var flyout = this.generateFlyoutChain(1)[0];
            var msg = "Left arrow key should not hide the current flyout if it is not the subFlyout of another shown flyout.";

            function beforeHide() {
                flyout.removeEventListener("beforehide", beforeHide, false);
                LiveUnit.Assert.fail(msg);
            }

            this.showFlyout(flyout).then(() => {

                this.verifyCascade([flyout]);

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
            var flyoutChain = this.generateFlyoutChain();

            var verifyKeyCollapsesTheCascade = (keyCode: number, keyName: string) => {
                return new WinJS.Promise((completePromise) => {
                    this.showFlyoutChain(flyoutChain).then(() => {

                        var headFlyout = flyoutChain[0],
                            tailFlyout = flyoutChain[flyoutChain.length - 1];

                        listenOnce(headFlyout, "afterhide", () => {
                            this.verifyCascade([]);
                            completePromise();
                        });

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

        testFlyoutsBlockedFromShowingDuringReEntrancy_WillBeShownAsyncronously = function (complete) {
            // Regression test: https://github.com/winjs/winjs/issues/882
            // Verifies that showing a 2nd Flyout chain at the beginning of hiding the 1st Flyout chain,
            // will cause the 2nd Flyout chain to show once the 1st cascade is finished collapsing.
            var chain1 = this.generateFlyoutChain(),
                chain2 = this.generateFlyoutChain();

            this.showFlyoutChain(chain1).then(() => {
                chain1[0].onbeforehide = () => {

                    // Sanity Check to make sure we are actually testing against the reentrancyLock
                    LiveUnit.Assert.isTrue(Flyout._cascadeManager.reentrancyLock, "TEST ERROR: Test is only valid when reentrancyLock is enabled");

                    this.showFlyoutChain(chain2).then(() => {
                        this.verifyCascade(chain2);
                        complete();
                    });
                };
                chain1[0].hide();
            });
        }

        testFocusMovesWithinCascadeSynchronously = function (complete) {
            // Verifies Overlay.show and Overlay.hide move focus synchronously
            // when focus is being moved between Overlays within the cascade.

            var testShow = (overlay) => {
                var promise = OverlayHelpers.show(overlay);
                LiveUnit.Assert.areEqual(overlay.element, document.activeElement,
                    "Overlay should have received focus synchronously during show");
                return promise;
            };

            var chain = this.generateFlyoutChain();

            testShow(chain[0]).then(() => {
                return testShow(chain[1]);
            }).then(() => {
                    OverlayHelpers.hide(chain[1]);
                    LiveUnit.Assert.areEqual(chain[0].element, document.activeElement,
                        "Hidden Overlay should have synchronously moved focus to its parent Overlay during hide");
                    OverlayHelpers.hide(chain[0]);
                    complete();
                });
        }
    }

    // Test Class for Cascading Flyout unit tests.
    export class CascadingFlyoutTests extends _BaseCascadingTests {

        // Implementation of Abstract showFlyout Method.
        showFlyout(flyout: WinJS.UI.PrivateFlyout): WinJS.Promise<any> {
            return OverlayHelpers.show(flyout);
        }

        // Implementation of Abstract generateFlyoutChain Method.
        generateFlyoutChain(numFlyouts?: number): Array<WinJS.UI.PrivateFlyout> {
            // Creates and returns an Array of Flyouts. Each Flyout in the chain has its anchor property set to the HTMLElement of the previous flyout.
            var flyoutChain = [],
                chainClass = "chain_" + ++chainCounter,
                anchor,
                prevFlyout;

            // Default fallback.
            numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;

            for (var i = 0; i < numFlyouts; i++) {
                anchor = prevFlyout ? prevFlyout.element : _defaultAnchor;

                var flyout = new Flyout(null, { anchor: anchor });
                document.body.appendChild(flyout.element);
                WinJS.Utilities.addClass(flyout.element, chainClass);
                flyout.element.id = (i + 1) + "of" + numFlyouts;

                flyoutChain.push(flyout);
                prevFlyout = flyout;
            }
            return flyoutChain;
        }

        // Implementation of Abstract chainFlyouts Method.
        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            // Chain the tail Flyout to the head Flyout.
            tail.anchor = head.element;
        }
    }

    // Test Class for Cascading Menu unit tests.
    export class CascadingMenuTests extends _BaseCascadingTests {
        private firstCommandId = "flyoutCmd1";
        private secondCommandId = "flyoutCmd2";

        // Implementation of Abstract showFlyout Method.
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

            return result;
        }

        // Implementation of Abstract generateFlyoutChain Method.
        generateFlyoutChain(numMenus?: number): Array<WinJS.UI.PrivateFlyout> {
            // Creates and returns an Array of Menu Flyouts. Each Menu in the chain has its anchor property set to the HTMLElement of parent Menu's flyout MenuCommand
            var flyoutChain = [],
                chainClass = "chain_" + ++chainCounter,
                anchor,
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
                    menu.anchor = _defaultAnchor;
                }

                flyoutChain.push(menu);
                prevMenu = menu;
            }
            return flyoutChain;
        }

        // Implementation of Abstract chainFlyouts Method.
        chainFlyouts(head: WinJS.UI.PrivateFlyout, tail: WinJS.UI.PrivateFlyout): void {
            // Chain the tail Menu to the head Menu.
            var menuCommand = head.element.querySelector("#" + this.secondCommandId).winControl;
            menuCommand.flyout = tail;
        }

        //
        // Unit Tests
        //

        testMenuCommandActionCommittedCollapsesEntireCascade = function (complete) {
            var flyoutChain = this.generateFlyoutChain();

            var buttonCmd = new MenuCommand(null, { type: 'button' });
            flyoutChain[flyoutChain.length - 1].commands = [buttonCmd];

            this.showFlyoutChain(flyoutChain).then(() => {

                var pArr = [];

                flyoutChain.forEach((flyout) => {
                    pArr.push(new WinJS.Promise((c) => {
                        listenOnce(flyout, "afterhide", c);
                    }));

                })

                WinJS.Promise.join(pArr).then(() => {
                    this.verifyCascade([]);
                    complete();
                });

                buttonCmd._invoke(); // We expect this to trigger collapse of entire cascade.
            });
        }

        testHorizontalLayoutOfCascadedSubMenus = function (complete) {

            var iframe = document.createElement("iframe");
            iframe.src = "$(TESTDATA)/WinJSSandbox.html";
            iframe.onload = function () {

                // This test requires the WinJS loaded inside of the iframe to ensure that private
                // WinJS internal helper functions identify the edge of the iframe's visual
                // viewport as the edge of the visible document, so that Cascading Menu's will
                // correctly avoid clipping through the edge of their contentwindow when showing.
                var iframeWinJS = <typeof WinJS>iframe.contentWindow["WinJS"];
                var iframeMenu = <typeof WinJS.UI.PrivateMenu> iframeWinJS.UI.Menu;
                var iframeMenuCommand = <typeof WinJS.UI.PrivateMenuCommand> iframeWinJS.UI.MenuCommand;

                var iframeDocument = iframe.contentDocument;

                var defaultAnchor = iframeDocument.createElement("DIV");
                var parentMenu = new iframeMenu();
                var subMenu = new iframeMenu();

                var flyoutCommand = new iframeMenuCommand(null, { type: 'flyout', flyout: subMenu, label: 'show submenu' });
                var subMenuCommands = [
                    // 9 MenuCommands will ensure that the subMenu is quite a bit taller than the parentmenu.
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd1' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd2' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd3' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd4' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd5' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd6' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd7' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd8' }),
                    new iframeMenuCommand(null, { type: 'button', label: 'cmd9' }),
                ];

                parentMenu.anchor = defaultAnchor;
                parentMenu.commands = [flyoutCommand];

                subMenu.anchor = flyoutCommand.element;
                subMenu.commands = subMenuCommands;

                iframeDocument.body.appendChild(defaultAnchor);
                iframeDocument.body.appendChild(parentMenu.element);
                iframeDocument.body.appendChild(subMenu.element);

                var parentMenuBorderBoxWidth: number; // content, padding, border;
                var parentMenuMargins: { left: number; right: number; top: number; bottom: number; };
                var subMenuBorderBoxWidth: number; // content, padding, border, 
                var subMenuMargins: { left: number; right: number; top: number; bottom: number; };
                var iframeWidth: number;
                var expectedOverlap = 4;
                var requiredSpaceForLeftCascade: number;
                var requiredSpaceForRightCascade: number;

                function asyncShow(menu: WinJS.UI.PrivateMenu, anchor, placement?, alignment?): WinJS.Promise<any> {
                    return new WinJS.Promise(function (c, e, p): void {
                        if (!menu.hidden) {
                            c();
                        } else {
                            function afterShow(): void {
                                menu.removeEventListener("aftershow", afterShow, false);
                                c();
                            };
                            menu.addEventListener("aftershow", afterShow, false);
                            menu.show(anchor, placement, alignment);
                        }
                    });
                }

                function asyncHide(menu: WinJS.UI.PrivateMenu): WinJS.Promise<any> {
                    return new WinJS.Promise(function (c, e, p): void {
                        if (menu.hidden) {
                            c();
                        } else {
                            function afterHide(): void {
                                menu.removeEventListener("afterhide", afterHide, false);
                                c();
                            };
                            menu.addEventListener("afterhide", afterHide, false);
                            menu.hide();
                        }
                    });
                }

                function verifySubMenuInBounds(subMenu) {

                    var subMenuRect = subMenu.element.getBoundingClientRect();

                    LiveUnit.Assert.isTrue(subMenuRect.left + subMenuMargins.left >= 0,
                        "left edge of subMenu marginbox should not overrun left edge of visual viewport");
                    LiveUnit.Assert.isTrue(subMenuRect.right + subMenuMargins.right <= iframeWidth,
                        "right edge of subMenu marginbox should not overrun right edge of visual viewport");

                }

                function configureParentMenuInIframe(visibleSpaceLHS, visibleSpaceRHS): WinJS.Promise<any> {

                    return new WinJS.Promise((c) => {

                        function iframeResize() {
                            iframe.contentWindow.removeEventListener("resize", iframeResize, false);

                            // PRECONDITION: Sanity check that Iframe width is the value we intended.
                            LiveUnit.Assert.areEqual(iframeWidth, iframe.offsetWidth,
                                "TEST ERROR: Test expects iframe width of " + iframeWidth + "px");

                            // PRECONDITION: Sanity check visualViewportWidth matches iframeWidth
                            var iframeVisualViewportWidth = iframeWinJS.UI._Overlay._keyboardInfo._visualViewportWidth;
                            LiveUnit.Assert.areEqual(iframe.offsetWidth, iframeVisualViewportWidth,
                                "TEST ERROR:  Iframe's WinJS should report that the visual viewport width matches the iframe width");

                            asyncShow(parentMenu, defaultAnchor)
                                .then(() => {
                                    parentMenu.element.style.left = (visibleSpaceLHS - parentMenuMargins.left) + "px";

                                    // PRECONDITION: Sanity check that the iframe and parentMenu have been configured correctly.
                                    var parentMenuRect = parentMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.areEqual(visibleSpaceLHS, parentMenuRect.left,
                                        "TEST ERROR: Test expects " + visibleSpaceLHS + " free space to the left of the parentMenu");
                                    LiveUnit.Assert.areEqual(visibleSpaceRHS, iframeVisualViewportWidth - parentMenuRect.right,
                                        "TEST ERROR: Test expects " + visibleSpaceRHS + " free space to the right of the parentMenu");
                                })
                                .done(c);
                        }

                        iframeWidth = visibleSpaceLHS + parentMenuBorderBoxWidth + visibleSpaceRHS;
                        iframe.contentWindow.addEventListener("resize", iframeResize, false);
                        iframe.style.width = iframeWidth + "px";
                    });
                }

                function takeBaseMeasurements(): WinJS.Promise<any> {
                    return new WinJS.Promise((c) => {
                        asyncShow(parentMenu, defaultAnchor)
                            .then(() => {
                                parentMenuBorderBoxWidth = parentMenu.element.getBoundingClientRect().width;
                                parentMenuMargins = WinJS.Utilities._getPreciseMargins(parentMenu.element);

                                return asyncHide(parentMenu);
                            })
                            .then(() => { 
                                return asyncShow(subMenu, defaultAnchor)
                            })
                            .then(() => {
                                subMenuBorderBoxWidth = subMenu.element.getBoundingClientRect().width;
                                subMenuMargins = WinJS.Utilities._getPreciseMargins(subMenu.element);
                                requiredSpaceForLeftCascade = subMenuMargins.left + subMenuBorderBoxWidth - expectedOverlap;
                                requiredSpaceForRightCascade = subMenuBorderBoxWidth - expectedOverlap + subMenuMargins.right;

                                return asyncHide(subMenu);
                            })
                            .done(c);
                    });
                }

                takeBaseMeasurements()
                    .then(() => { 
                        // TEST 1
                        return new WinJS.Promise((c) => {
                            // Set up test for fit right.
                            var parentMenuRect: ClientRect;
                            var subMenuRect: ClientRect;
                            configureParentMenuInIframe(requiredSpaceForLeftCascade, requiredSpaceForRightCascade)
                                .then(() => {

                                    // PRECONDITION: Sanity check that parent menu has enough room to fit a subMenu on either side.
                                    parentMenuRect = parentMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.isTrue(parentMenuRect.left >= requiredSpaceForLeftCascade,
                                        "TEST ERROR: Test requires more room between left edge of parent menu and the left edge of the visual viewport");
                                    LiveUnit.Assert.isTrue(iframeWidth - parentMenuRect.right >= requiredSpaceForRightCascade,
                                        "TEST ERROR: Test requires more room between right edge of parent menu and the right edge of the visual viewport");

                                    // Perform test
                                    return iframeMenuCommand._activateFlyoutCommand(subMenu.anchor.winControl);
                                })
                                .then(() => {

                                    // Verify subMenu cascades to the right when there is enough space on either side.
                                    subMenuRect = subMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.areEqual(parentMenuRect.right - subMenuRect.left, expectedOverlap,
                                        "left edge of subMenu should overlap right edge of parent menu by " + expectedOverlap + "px");

                                    verifySubMenuInBounds(subMenu);

                                    // Hide subMenu
                                    return iframeMenuCommand._deactivateFlyoutCommand(subMenu.anchor.winControl)
                                })
                                .done(c);
                        });
                    })
                    .then(() => {
                        // TEST 2
                        return new WinJS.Promise((c) => {
                            // Set up test for fit left.

                            var parentMenuRect: ClientRect;
                            var subMenuRect: ClientRect;

                            configureParentMenuInIframe(requiredSpaceForLeftCascade, requiredSpaceForRightCascade -1)
                                .then(() => {

                                    // PRECONDITION: Sanity check that there is only enough room to fit a subMenu on the left side of the parentMenu.
                                    parentMenuRect = parentMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.isTrue(parentMenuRect.left >= requiredSpaceForLeftCascade,
                                        "TEST ERROR: TODO");
                                    LiveUnit.Assert.isTrue(iframeWidth - parentMenuRect.right < requiredSpaceForRightCascade,
                                        "TEST ERROR: TODO");

                                    // Perform test
                                    return iframeMenuCommand._activateFlyoutCommand(subMenu.anchor.winControl);
                                })
                                .then(() => {

                                    // Verify subMenu cascades to the left when there is only enough room to the left.
                                    subMenuRect = subMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.areEqual(subMenuRect.right - parentMenuRect.left, expectedOverlap,
                                        "right edge of subMenu should overlap left edge of parent menu by " + expectedOverlap + "px");

                                    verifySubMenuInBounds(subMenu);

                                    // Hide subMenu
                                    return iframeMenuCommand._deactivateFlyoutCommand(subMenu.anchor.winControl)
                                })
                                .done(c);
                        });
                    })
                    .then(() => {
                        // TEST 3
                        return new WinJS.Promise((c) => {
                            // Set up test for pinning to right edge of visible document.

                            var parentMenuRect: ClientRect;
                            var subMenuRect: ClientRect;

                            configureParentMenuInIframe(requiredSpaceForLeftCascade - 1, requiredSpaceForRightCascade - 1)
                                .then(() => {

                                    // PRECONDITION: Sanity check that there is not enough room to fit a subMenu on either side of the parentMenu.
                                    parentMenuRect = parentMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.isTrue(parentMenuRect.left < requiredSpaceForLeftCascade,
                                        "TEST ERROR: TODO");
                                    LiveUnit.Assert.isTrue(iframeWidth - parentMenuRect.right < requiredSpaceForRightCascade,
                                        "TEST ERROR: TODO");

                                    // Perform test
                                    return iframeMenuCommand._activateFlyoutCommand(subMenu.anchor.winControl);
                                })
                                .then(() => {

                                    // Verify subMenu cascades to the left when there is only enough room to the left.
                                    subMenuRect = subMenu.element.getBoundingClientRect();
                                    LiveUnit.Assert.areEqual(iframeWidth, subMenuRect.right + subMenuMargins.right,
                                        "right edge of subMenu marginbox should pin to the right edge of the iframe if there " +
                                        "isn't enough space to cascade on either side of the parentMenu");

                                    verifySubMenuInBounds(subMenu);

                                    // Hide subMenu
                                    return iframeMenuCommand._deactivateFlyoutCommand(subMenu.anchor.winControl)
                                })
                                .done(c);
                        });
                    }).done(() => {
                        // Clean up
                        parentMenu.dispose();
                        subMenu.dispose();
                        complete();
                    });

            };
            document.body.appendChild(iframe);
        }

    testVerticalAlignmentOfCascadedSubMenus = function (complete) {
            // align top
            // align bottom
            // center vertically
            // pin to top and bottom window if too tall.
            complete();
        }
    }
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.CascadingFlyoutTests");
LiveUnit.registerTestClass("CorsicaTests.CascadingMenuTests");