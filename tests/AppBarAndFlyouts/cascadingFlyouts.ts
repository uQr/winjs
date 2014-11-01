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
    var cascadeManager = WinJS.UI.Flyout['_cascadeManager'];

    var DEFAULT_CHAIN_SIZE = 4; // default

    function hideFlyout(flyout?: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Hides the specified flyout and all its subflyout in the cascade. 
        // If no flyout is specified we hide the entire cascade. 
        // Returns a promise that completes when all affected flyouts are finished hiding.

        var index = cascadeManager.indexOf(flyout);
        index = (index < 0) ? 0 : index;

        var flyoutChain: Array<WinJS.UI.Flyout> = cascadeManager._cascadingStack.slice(index, cascadeManager.length);

        var hidingPromises: Array<WinJS.Promise<any>> = flyoutChain.map(function (flyout) {
            return new WinJS.Promise(function (c, e, p) {
                function afterHide() {
                    flyout.removeEventListener("afterhide", afterHide, false);
                    c();
                };

                flyout.addEventListener("afterhide", afterHide, false);
            });
        });

        flyoutChain[0].hide();
        return WinJS.Promise.join(hidingPromises);
    }

    function showFlyout(flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Show the specified flyout and returns a promise that is completed when the flyout has finished showing.
        return new WinJS.Promise(function (c, e, p) {
            function afterShow() {
                flyout.removeEventListener("aftershow", afterShow, false);
                c();
            };
            flyout.addEventListener("aftershow", afterShow, false);
            flyout.show();
        });
    }

    function expandChain(flyoutChain: Array<WinJS.UI.Flyout>, sentinelFlyout?: WinJS.UI.Flyout): WinJS.Promise<any> {
        // Shows all flyouts in the specified flyoutChain until the sentinel flyout is shown.
        // If no sentinel is specified, the entire chain is shown.
        // Returns a promise that is completed when the last flyout is finished showing.

        var index = flyoutChain.indexOf(sentinelFlyout);
        flyoutChain = (index < 0) ? flyoutChain : flyoutChain.slice(0, index + 1);

        var p = WinJS.Promise.wrap();
        flyoutChain.forEach(function (flyout, index) {
            p = p.then(function () {
                return showFlyout(flyoutChain[index]);
            });
        });

        return p;
    }

    var generateFlyoutChain = function generateFlyoutChain(numFlyouts?: number): Array<WinJS.UI.Flyout> {
        var flyoutChain = [],
            prevFlyout;

        numFlyouts = numFlyouts || DEFAULT_CHAIN_SIZE;

        for (var i = 0; i < numFlyouts; i++) {
            var anchor = prevFlyout ? prevFlyout.element : _rootAnchor;

            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);

            flyoutChain.push(new WinJS.UI.Flyout(flyoutElement, { anchor: anchor }));
            prevFlyout = flyoutChain[i];
        }
        return flyoutChain;
    }

    export class CascadingFlyoutTests {

        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");

            _rootAnchor = document.createElement('button');
            _rootAnchor.id = "root";
            document.body.appendChild(_rootAnchor);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            cascadeManager.empty();

            var flyouts = document.querySelectorAll(".win-flyout");
            Array.prototype.forEach.call(flyouts, function (element) {
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

                var msg = "Showing a flyout should always add it to the cascade";
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
                LiveUnit.Assert.areEqual(cascadeManager.length, 0);

                complete();
            };

            var flyoutElement = document.createElement("div");
            document.body.appendChild(flyoutElement);
            var flyout = new WinJS.UI.Flyout(flyoutElement, { anchor: _rootAnchor });

            var msg = "The cascade should be empty when no flyouts are showing";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.areEqual(cascadeManager.length, 0, msg);

            flyout.addEventListener("aftershow", checkAfterShow, false);
            flyout.addEventListener("afterhide", checkAfterHide, false);

            flyout.show();
        }

        testChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function (complete) {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in a cascade.

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain();

            expandChain(flyoutChain).then(function () {
                var msg = "Each chained flyout that was shown should have been appended to the cascade in order";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadeManager.length, msg);
                for (var i = 0, len = flyoutChain.length; i < len; i++) {
                    LiveUnit.Assert.areEqual(flyoutChain[i], cascadeManager.getAt(i), msg);
                }

                msg = "There should be " + flyoutChain.length + " flyouts visible after cascading the entire flyout chain.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                var cascadingFlyouts = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement) {
                    return !flyoutElement.winControl.hidden;
                });
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadingFlyouts.length, msg);

                complete();
            });
        }

        xtestChainedFlyoutsWillAppendToTheCascadeWhenShownInOrder = function(complete) {
            // Verifies that showing chained flyouts, one after the other, in order, will cause them all show in a cascade.

            var flyoutChain: Array<WinJS.UI.Flyout> = generateFlyoutChain();

            expandChain(flyoutChain).then(function () {
                var msg = "Each chained flyout that was shown should have been appended to the cascade in order";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadeManager.length, msg);
                for (var i = 0, len = flyoutChain.length; i < len; i++) {
                    LiveUnit.Assert.areEqual(flyoutChain[i] === cascadeManager.getAt(i), msg);
                }

                msg = "There should be " + flyoutChain.length + " flyouts visible after cascading the entire flyout chain.";
                LiveUnit.LoggingCore.logComment("Test: " + msg);
                var cascadingFlyouts = Array.prototype.filter.call(document.querySelectorAll(".win-flyout"), function (flyoutElement) {
                    return !flyoutElement.winControl.hidden;
                });
                LiveUnit.Assert.areEqual(flyoutChain.length, cascadingFlyouts.length, msg);
            });
        }

        xtestFocusIsManagedInTheCascade = function(complete) {
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