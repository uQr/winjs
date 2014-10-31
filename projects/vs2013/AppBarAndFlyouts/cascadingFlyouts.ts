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

    function hideStack(flyout: WinJS.UI.Flyout): WinJS.Promise<any> {

        var index = cascadeManager.contains(flyout); // If this is false how to I fail and stop the promise chain.

        var promiseArray =  cascadeManager._cascadingStack.slice(index, cascadeManager._cascadingStack.length).map(function () {

            return new WinJS.Promise(function (c, e, p) {
                function afterHide() {
                    flyout.removeEventListener("afterhide", afterHide, false);
                    c();
                };

                flyout.addEventListener("afterhide", afterHide, false);
            });

        });

        flyout.hide();

        return WinJS.Promise.join(promiseArray);
    }

    function show(flyout: WinJS.UI.Flyout): WinJS.Promise<any> {
        return new WinJS.Promise(function (c, e, p) {
            function afterShow() {
                flyout.removeEventListener("aftershow", afterShow, false);
                c();
            };

            flyout.addEventListener("aftershow", afterShow, false);
        });
    }

    function showCascade(flyouts: Array<WinJS.UI.Flyout>, count?: number): WinJS.Promise<any> {
        count = count || flyouts.length;

        var p = WinJS.Promise.wrap();
        flyouts.slice(0, count).forEach(function (flyout, index) {
            p = p.then(function () {
                return show(flyouts[index]);
            });
        });

        return p;
    }

    

    //var p = Promise.wrap();
    //flyouts.forEach(function (flyout, i) {
    //    p = p.then(function () {
    //        return show(flyout);
    //    });
    //});

    //function showCascade(flyouts: Array<WinJS.UI.Flyout>, count?: number): WinJS.Promise<any> {
    //    return new WinJS.Promise(function (c, e, p) {

    //        function chainShowOperations(flyout: WinJS.UI.Flyout, subFlyout: WinJS.UI.Flyout) {

    //            function afterShow() {
    //                flyout.removeEventListener("aftershow", afterShow, false);
    //                if (subFlyout) {
    //                    subFlyout.show();
    //                } else {
    //                    // All flyouts are shown.
    //                    c();
    //                }
    //            };

    //            flyout.addEventListener("aftershow", afterShow, false)
    //        };

    //        for (var i = 0; i < count && i < flyouts.length; i++) {
    //            chainShowOperations(flyouts[i], flyouts[i + 1]);
    //        }

    //        flyouts[0].show();
    //    });
    //}

    //function hideCascade(): WinJS.Promise<any> {
    //    return new WinJS.Promise(function (c, e, p) { });

    //}

    var generateCascade = function (numFlyouts: number): Array<WinJS.UI.Flyout> {
        var flyouts = [];

        var prevFlyout;
        for (var i = 0; i < numFlyouts; i++) {

            var anchor = prevFlyout ? prevFlyout.element : _rootAnchor;

            var flyoutElement = document.createElement("div");
            //flyoutElement.id = "cascade" + i;
            document.body.appendChild(flyoutElement);

            prevFlyout = new WinJS.UI.Flyout(flyoutElement, { anchor: anchor });
            flyouts.push(prevFlyout);
        }
        return flyouts;
    }

    export class CascadingFlyoutsTests {

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

        testCascade(complete) {

            var flyouts = generateCascade(3);
            showPromise = showCascade(flyouts);

        }

        //// Test flyout Instantiation
        //testDismissesWhenLosingFocus = function (complete) {
        //    var root = _element;
        //    root.innerHTML =
        //    "<button id='outsideFlyout'>outsideFlyout</button>" +
        //    "<div id='anchor'></div>" +
        //    "<div id='flyout'>" +
        //    "<button id='button0'>Button0</button>" +
        //    "<button id='button1'>Button1</button>" +
        //    "</div>";
        //    var outsideFlyout = root.querySelector("#outsideFlyout");
        //    var flyout = new WinJS.UI.Flyout(root.querySelector("#flyout"), {
        //        anchor: root.querySelector("#anchor")
        //    });

        //    OverlayHelpers.Assert.dismissesWhenLosingFocus({
        //        overlay: flyout,
        //        focusTo: outsideFlyout
        //    }).then(complete);
        //};
    }
}