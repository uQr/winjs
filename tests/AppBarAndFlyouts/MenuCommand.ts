// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="OverlayHelpers.ts" />

module CorsicaTests {

    "use strict";

    var _Constants;
    var _ToolbarConstants;
    var _element;
    WinJS.Utilities._require(["WinJS/Controls/AppBar/_Constants"], function (constants) {
        _Constants = constants;
    })

    var commonUtils = Helper;

    export class MenuCommandTests {

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");

            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
            OverlayHelpers.disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
            WinJS.UI._Overlay._clickEatingAppBarDiv = false;
            WinJS.UI._Overlay._clickEatingFlyoutDiv = false;
        }

        // Test MenuCommand Instantiation
        testMenuCommandInstantiation = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommandElement = document.createElement('hr');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new WinJS.UI.MenuCommand(menuCommandElement, { type: 'separator' });
            LiveUnit.LoggingCore.logComment("MenuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand element should not be null when instantiated.");
            OverlayHelpers.disposeAndRemove(menuCommandElement);

            // We have no functions
        }

        // Test MenuCommand Instantiation with null element
        testMenuCommandNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand with null element");
            var menuCommand = new WinJS.UI.MenuCommand(null, { type: 'separator' });
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand instantiation was null when sent a null MenuCommand element.");
        }

        // Test multiple instantiation of the same MenuCommand DOM element
        testMenuCommandMultipleInstantiation() {
            MenuCommandTests.prototype.testMenuCommandMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommandElement = document.createElement('hr');
            document.body.appendChild(menuCommandElement);
            var menuCommand = new WinJS.UI.MenuCommand(menuCommandElement, { type: 'separator' });
            LiveUnit.LoggingCore.logComment("MenuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "MenuCommand element should not be null when instantiated.");
            try {
                new WinJS.UI.MenuCommand(menuCommandElement, { type: 'separator' });
                LiveUnit.Assert.fail("Expected WinJS.UI.MenuCommand.DuplicateConstruction exception");
            } finally {
                OverlayHelpers.disposeAndRemove(menuCommandElement);
            }
        }

        // Test MenuCommand parameters
        testMenuCommandParams = function () {
            function testGoodInitOption(paramName, value) {
                LiveUnit.LoggingCore.logComment("Testing creating a MenuCommand using good parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                var menuCommand = new WinJS.UI.MenuCommand(null, options);
                LiveUnit.Assert.isNotNull(menuCommand);
            }

            function testBadInitOption(paramName, value, expectedName, expectedMessage) {
                LiveUnit.LoggingCore.logComment("Testing creating a MenuCommand using bad parameter " + paramName + "=" + value);
                var options = { type: 'button', label: 'test', icon: 'test.png' };
                options[paramName] = value;
                try {
                    new WinJS.UI.MenuCommand(null, options);
                    LiveUnit.Assert.fail("Expected creating MenuCommand with " + paramName + "=" + value + " to throw an exception");
                } catch (e) {
                    LiveUnit.LoggingCore.logComment(e.message);
                    LiveUnit.Assert.isTrue(e !== null);
                    LiveUnit.Assert.isTrue(e.name === expectedName);
                    LiveUnit.Assert.isTrue(e.message === expectedMessage);
                }
            }

            LiveUnit.LoggingCore.logComment("Testing id");
            testGoodInitOption("id", "ralph");
            testGoodInitOption("id", "fred");
            testGoodInitOption("id", -1);
            testGoodInitOption("id", 12);
            testGoodInitOption("id", {});

            LiveUnit.LoggingCore.logComment("Testing type");
            testGoodInitOption("type", "button");
            testGoodInitOption("type", "flyout");
            testGoodInitOption("type", "toggle");
            testGoodInitOption("type", "separator");

            LiveUnit.LoggingCore.logComment("Testing label");
            testGoodInitOption("label", "test");
            testGoodInitOption("label", "a");
            testGoodInitOption("label", -1);
            testGoodInitOption("label", 12);
            testGoodInitOption("label", {});

            LiveUnit.LoggingCore.logComment("Testing flyout");
            testGoodInitOption("flyout", "test");
            testGoodInitOption("flyout", "");
            testGoodInitOption("flyout", "&#xE106;");
            testGoodInitOption("flyout", { id: "test" });
            testGoodInitOption("flyout", { uniqueId: "test" });
            testGoodInitOption("flyout", { element: { id: "test" } });
            testGoodInitOption("flyout", { element: { uniqueId: "test" } });

            LiveUnit.LoggingCore.logComment("Testing disabled");
            testGoodInitOption("disabled", true);
            testGoodInitOption("disabled", false);
            testGoodInitOption("disabled", -1);
            testGoodInitOption("disabled", "what");
            testGoodInitOption("disabled", {});

            LiveUnit.LoggingCore.logComment("Testing selected");
            testGoodInitOption("selected", true);
            testGoodInitOption("selected", false);
            testGoodInitOption("selected", -1);
            testGoodInitOption("selected", "what");
            testGoodInitOption("selected", {});

            // TODO: Still need to test click

            LiveUnit.LoggingCore.logComment("Testing element");
            //testBadInitOption("element", {}, WinJS.UI.MenuCommand.badElement);
        }

        testDefaultMenuCommandParameters = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommand = new WinJS.UI.MenuCommand(null, { label: 'test', icon: 'test.png' });
            LiveUnit.LoggingCore.logComment("menuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "menuCommand element should not be null when instantiated.");

            LiveUnit.Assert.isNotNull(menuCommand.element, "Verifying that element is not null");
            LiveUnit.Assert.areEqual("", menuCommand.id, "Verifying that id is empty string");
            LiveUnit.Assert.areEqual("button", menuCommand.type, "Verifying that type is 'button'");
            LiveUnit.Assert.areEqual("test", menuCommand.label, "Verifying that label is 'test'");
            //thisWinUI.menuCommand.badClick = "Invalid argument: The onclick property for an menuCommand must be a Function";
            //thisWinUI.menuCommand.badFlyout = "Invalid argument: The flyout property for an menuCommand must be a Flyout or String id of a Flyout";
            LiveUnit.Assert.isFalse(menuCommand.disabled, "Verifying that disabled is false");
            LiveUnit.Assert.isFalse(menuCommand.hidden, "Verifying that hidden is false");
            LiveUnit.Assert.isFalse(menuCommand.selected, "Verifying that selected is false");
        }

        // Simple Property tests
        testSimpleMenuCommandProperties = function () {
            // Get the MenuCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the MenuCommand element");
            var menuCommand = new WinJS.UI.MenuCommand(null, { label: 'test', icon: 'test.png', type: 'toggle', extraClass: 'extra' });
            LiveUnit.LoggingCore.logComment("menuCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(menuCommand, "menuCommand element should not be null when instantiated.");

            // Cycle selected
            LiveUnit.Assert.areEqual(false, menuCommand.selected, "Verifying that selected is false");
            menuCommand.selected = true;
            LiveUnit.Assert.areEqual(true, menuCommand.selected, "Verifying that selected is true");
            menuCommand.selected = false;
            LiveUnit.Assert.areEqual(false, menuCommand.selected, "Verifying that selected goes back to false");

            // Cycle extra class
            LiveUnit.Assert.areEqual("extra", menuCommand.extraClass, "Verifying that extraClass is 'extra'");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("extra"), "Verifying that className is 'extra'");
            menuCommand.extraClass = "somethingElse";
            LiveUnit.Assert.areEqual("somethingElse", menuCommand.extraClass, "Verifying that extraClass is 'somethingElse");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("somethingElse"), "Verifying that className is 'somethingElse");
            menuCommand.extraClass = "another";
            LiveUnit.Assert.areEqual("another", menuCommand.extraClass, "Verifying that extraClass is 'another'");
            LiveUnit.Assert.isTrue(menuCommand.element.classList.contains("another"), "Verifying that className is 'another'");

            // Check flyout with empty id
            var fakeDomObject: any = { uniqueID: 'unique' };
            menuCommand.flyout = fakeDomObject;
            LiveUnit.Assert.areEqual("unique", fakeDomObject.id, "Verifying that id is set to 'unique' from uniqueID");
            LiveUnit.Assert.areEqual("unique", menuCommand.element.getAttribute("aria-owns"), "Verifying that aria-owns is set by flyout setter");
        }

        // Hidden Property tests
        testHiddenProperty = function () {
            LiveUnit.LoggingCore.logComment("Attempt to test hidden property on menucommand");
            // Get the Menu element from the DOM
            var menuElement = document.createElement("div");
            document.body.appendChild(menuElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the Menu element");
            var Menu = new WinJS.UI.Menu(menuElement, { commands: { id: 'cmdA' } });
            Menu.hide();
            var cmd = Menu.getCommandById("cmdA");
            cmd.hidden = true;
            LiveUnit.Assert.areEqual(true, cmd.hidden, "verify the command is now hidden");
            Menu.show(menuElement);
            var result = false;
            try {
                cmd.hidden = false;
            } catch (err) {
                // we throw
                result = true;
            }
            OverlayHelpers.disposeAndRemove(menuElement);
            LiveUnit.Assert.areEqual(true, result, "verify the hidden property throw the exception");
        }

        // Tests for dispose members and requirements
        testMenuCommandDispose = function () {
            var button = document.createElement("button");
            var mc = <WinJS.UI.PrivateMenuCommand>new WinJS.UI.MenuCommand(button);
            LiveUnit.Assert.isTrue(mc.dispose);
            LiveUnit.Assert.isTrue(mc.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(mc._disposed);

            mc.dispose();
            LiveUnit.Assert.isTrue(mc._disposed);
            mc.dispose();
        }

        // Tests that previous innerHTML is cleared when we instantiate a new button.
        testMenuCommandRemovesOldInnerHTML = function () {
            var button = document.createElement("button");
            button.innerHTML = "<div id='testMenuCommandRemovesOldInnerHTML'>";
            LiveUnit.Assert.isTrue(button.querySelector("#testMenuCommandRemovesOldInnerHTML"));
            var mc = new WinJS.UI.MenuCommand(button);
            LiveUnit.Assert.isFalse(button.querySelector("#testMenuCommandRemovesOldInnerHTML"), "MenuCommand buttons should lose previous innerHTML on control Instantiation");

        }

        // Tests that 'flyout' typed menu commands invoke flyouts.
        testMenuCommandInvokesFlyout = function (complete) {
            var Key = WinJS.Utilities.Key;

            var testFlyout = new WinJS.UI.Flyout();
            document.body.appendChild(testFlyout.element);

            var mcb = new WinJS.UI.MenuCommand(null, { id: 'mcb', type: 'button' });
            var mcf = new WinJS.UI.MenuCommand(null, { id: 'mcf', type: 'flyout', flyout: testFlyout });

            var menu = new WinJS.UI.Menu(null, { commands: [mcb, mcf] });
            document.body.appendChild(menu.element);

            var verifyInvoke = function (afterMenuShow) {
                return new WinJS.Promise(function (c) {
                    testFlyout.onaftershow = function () {
                        testFlyout.onafterhide = c;
                        testFlyout.hide();
                    };
                    menu.onaftershow = afterMenuShow;
                    menu.show(document.body);
                });
            }

            verifyInvoke(function () {
                Helper.keydown(mcf.element, Key.rightArrow);
                //}).then(function () {
                //        return verifyInvoke(mcf.element.click.bind(mcf.element));
            }).then(function () {
                    return verifyInvoke(function () {
                        commonUtils.mouseOverUsingMiP(mcf.element, null);
                    });
                }).done(complete);
        }

        // Tests that 'flyout' typed menu commands invoke flyouts.
        testMenuCommandsInMenu = function (complete) {

            var verifyCommandsInMenu = function verifyCommandsInMenu(menu, buttonCommands = [], toggleCommands = [], flyoutCommands = [], separatorCommands = []) {
                return new WinJS.Promise(function (completePromise) {

                    var allCommands = buttonCommands.concat(toggleCommands).concat(flyoutCommands).concat(separatorCommands);
                    menu.showOnlyCommands(allCommands);

                    function menu_onaftershow() {
                        allCommands.forEach(function (command) {
                            if (command.type !== _Constants.typeSeparator) {
                                var toggleIconStyle = getComputedStyle(command._toggleIcon);
                                var flyoutIconStyle = getComputedStyle(command._flyoutIcon);

                                if (toggleCommands && toggleCommands.length) {
                                    LiveUnit.Assert.isFalse(toggleIconStyle.display === "none",
                                        "When a menu contains a visible toggle commands, EVERY command should reserve extra width for the toggle icon");
                                    if (command.type === _Constants.typeToggle && command.selected) {
                                        LiveUnit.Assert.isTrue(toggleIconStyle.visibility === "visible");
                                    } else {
                                        LiveUnit.Assert.isTrue(toggleIconStyle.visibility === "hidden");
                                    }
                                } else {
                                    LiveUnit.Assert.isTrue(toggleIconStyle.display === "none",
                                        "When a menu does not contain visible toggle commands, NO command should reserve space for the toggle icon");
                                }

                                if (flyoutCommands && flyoutCommands.length) {
                                    LiveUnit.Assert.isFalse(flyoutIconStyle.display === "none",
                                        "When a menu contains a visible flyout commands, EVERY command should reserve extra width for the flyout icon");
                                    if (command.type === _Constants.typeFlyout) {
                                        LiveUnit.Assert.isTrue(flyoutIconStyle.visibility === "visible");
                                    } else {
                                        LiveUnit.Assert.isTrue(flyoutIconStyle.visibility === "hidden");
                                    }
                                } else {
                                    LiveUnit.Assert.isTrue(flyoutIconStyle.display === "none",
                                        "When a menu does not contain visible flyout commands, NO command should reserve space for the flyout icon");
                                }
                            }
                        });
                        menu.onafterhide = completePromise;
                        menu.hide();

                    };
                    menu.onaftershow = menu_onaftershow;
                    menu.show();
                });
            }

            // commands
            var b1 = new WinJS.UI.MenuCommand(null, { type: 'button' }),
                t1 = new WinJS.UI.MenuCommand(null, { type: 'toggle', selected: true }),
                t2 = new WinJS.UI.MenuCommand(null, { type: 'toggle', selected: false }),
                f1 = new WinJS.UI.MenuCommand(null, { type: 'flyout' }),
                s1 = new WinJS.UI.MenuCommand(null, { type: 'separator' }),
                //buttonCommands = [b1, b2],
                //toggleCommands = [t1, t2],
                //flyoutCommands = [f1, f2],
                //separatorCommands = [s1, s2];
                commands = [b1, t1, t2, f1, s1];

            var menu = new WinJS.UI.Menu(null, { commands: commands });

            verifyCommandsInMenu(menu, [b1], [t1, t2], [f1], [s1]).then(function () {
                return verifyCommandsInMenu(menu);
            }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [], [], [s1]);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t1], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                }).then(function () {
                    return verifyCommandsInMenu(menu, [b1], [t2], [f1], []);
                })
        }
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.MenuCommandTests");
