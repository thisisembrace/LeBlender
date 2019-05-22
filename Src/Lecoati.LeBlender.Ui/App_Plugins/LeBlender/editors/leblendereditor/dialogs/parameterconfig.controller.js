angular.module("umbraco").controller("LeBlender.Dialog.Parameterconfig.Controller",
    function ($scope, assetsService, $http, dialogService, mediaHelper, $timeout, LeBlenderRequestHelper, umbPropEditorHelper) {

        angular.extend($scope, {
            name: $scope.dialogData.name,
            model: {
                value: [],
                global: []
            },
            config: {
                min: 1,
                max: 1,
                editors: [],
                globalEditors: []
            }
        });

        angular.extend($scope.config,
            $scope.dialogData.config);

        angular.extend($scope.model.value,
            $scope.dialogData.value);

        angular.extend($scope.model.global,
            $scope.dialogData.global);



        if ($scope.model.value.length > 0) {
            $scope.selected = $scope.model.value[0];
        }


        if (!$scope.config.min)
            $scope.config.min = 1;

        if (!$scope.config.max)
            $scope.config.max = 1;

        /***************************************/
        /* legacy adaptor 0.9.15 */
        /***************************************/
        if ($scope.config && $scope.config.fixed != undefined && $scope.config.limit) {
            if ($scope.config.fixed) {
                $scope.config.min = $scope.config.limit;
                $scope.config.max = $scope.config.limit;
            }
            else {
                $scope.config.min = 1;
                $scope.config.max = $scope.config.limit;
            }
            delete $scope.config.fixed;
            delete $scope.config.limit;
        }

        $scope.select = function (index) {
            $scope.selected = index;
        };

        $scope.remove = function (item, $index, $event) {

            if (item === $scope.selected) {
                if ($index === 0) {
                    $scope.selected = $scope.model.value[1];
                }
                else if ($index >= 0) {
                    $scope.selected = $scope.model.value[$index - 1];
                }
            }
            $scope.model.value.splice($index, 1);

        };

        $scope.add = function () {
            newItem = {};
            _.each($scope.config.editors, function (editor, editorIndex) {
                newItem[editor.alias] = $scope.NewProperty(editor, editorIndex, newItem);
            })
            $scope.model.value.splice($scope.model.value.length + 1, 0, newItem);
            $scope.selected = $scope.model.value[$scope.model.value.length - 1];
        };


        $scope.NewProperty = function (editor, order, destination) {

            var newProperty = {
                value: '',
                validation: {},
                dataTypeGuid: editor.dataType,
                editorAlias: editor.alias,
                editorName: editor.name,
                $editor: editor,
                $order: order,
            };
            newProperty.validation.mandatory = editor.mandatory;
            newProperty.validation.regex = editor.validation;
            newProperty.validation.error = "";

            return newProperty
        };

        $scope.SetGlobal = function () {
            if ((!$scope.model.global || $scope.model.global.length == 0) && $scope.config.globalEditors && $scope.config.globalEditors.length > 0) {
                newItem = {};
                _.each($scope.config.globalEditors, function (editor, editorIndex) {
                    newItem[editor.alias] = $scope.NewProperty(editor, editorIndex, newItem);
                })
                $scope.model.global.splice(1, 0, newItem);
            }
        };
















        $scope.sortableOptions = {
            handle: ".icon-navigation",
            axis: "y",
            delay: 150,
            distance: 5,
            stop: function (e, ui) {
                ui.item.parents("#blender-grid-editor-parameter").find('.mceNoEditor').each(function () {
                    tinyMCE.execCommand('mceRemoveEditor', false, $(this).attr('id'));
                    tinyMCE.execCommand('mceAddEditor', false, $(this).attr('id'));
                });
            }
        };

        $scope.searchEditor = function (alias) {

            if (alias == undefined)
                return undefined;

            var sEditor = undefined;
            if ($scope.config.globalEditors) {
                _.each($scope.config.globalEditors, function (editor, editorIndex) {
                    if (editor.alias === alias) {
                        sEditor = editor
                    }
                })
            }

            if (!sEditor && $scope.config.editors) {
                _.each($scope.config.editors, function (editor, editorIndex) {
                    if (editor.alias === alias) {
                        sEditor = editor
                    }
                })
            }

            return sEditor;
        }

        $scope.searchPropertyItem = function (item, alias) {
            var sProperty = undefined;
            _.each(item, function (property, propertyIndex) {
                if (property.editorAlias === alias) {
                    sProperty = property
                }
            })
            return sProperty;
        }

        var initEditor = function () {

            //first the Global values
            _.each($scope.model.global, function (item, itemIndex) {
                var order = 0;
                if ($scope.config.globalEditors) {
                    _.each($scope.config.globalEditors, function (editor, editorIndex) {
                        var property = $scope.searchPropertyItem(item, editor.alias);
                        if (property) {
                            property.$editor = editor;
                            property.$order = order;
                            if (!property.dataTypeGuid)
                                property.dataTypeGuid = editor.dataType;
                        }
                        else {
                            $scope.NewProperty(editor, order, item);
                        }
                        order++;
                    })
                }
                _.each(item, function (property, propertyIndex) {
                    if (!$scope.searchEditor(property.editorAlias)) {
                        delete item[property.editorAlias];
                    }
                })

            })


            _.each($scope.model.value, function (item, itemIndex) {
                var order = 0;
                if ($scope.config.editors) {
                    _.each($scope.config.editors, function (editor, editorIndex) {
                        var property = $scope.searchPropertyItem(item, editor.alias);
                        if (property) {
                            property.$editor = editor;
                            property.$order = order;
                            if (!property.dataTypeGuid)
                                property.dataTypeGuid = editor.dataType;
                        }
                        else {
                            $scope.NewProperty(editor, order, item);
                        }
                        order++;
                    })
                }
                _.each(item, function (property, propertyIndex) {
                    if (!$scope.searchEditor(property.editorAlias)) {
                        delete item[property.editorAlias];
                    }
                })

            })

        }




        $scope.updateEditor = function () {
            //if ($scope.model.value) {

            /***************************************/
            /* load dataType Info */
            /***************************************/
            var watchAppStart = $scope.$watch(function () {
                var isLoadedCounter = 0
                if ($scope.model.value) {
                    _.each($scope.config.editors, function (editor, editorIndex) {
                        if (editor.$isLoaded) {
                            isLoadedCounter++
                        }
                    });
                }
                _.each($scope.config.globalEditors, function (editor, editorIndex) {
                    if (editor.$isLoaded) {
                        isLoadedCounter++
                    }
                });

                return isLoadedCounter;
            }, function (newValue, oldValue) {
                if (newValue === ($scope.config.globalEditors.length + $scope.config.editors.length)) {
                    initEditor();
                    watchAppStart();
                    $scope.configLoaded = true;
                }
            }, true);
            /***************************************/

            /***************************************/
            /* load dataType Info */
            /***************************************/
            if ($scope.config.editors) {
                _.each($scope.config.editors, function (editor, editorIndex) {

                    if (!$scope.model.value.propretyType) {
                        $scope.model.value.propretyType = {};
                    }

                    /***************************************/
                    /* legacy adaptor 0.9.15 */
                    /***************************************/
                    if (!editor.dataType && editor.propretyType) {
                        switch (editor.propretyType.name) {
                            case "Textstring": editor.dataType = "0cc0eba1-9960-42c9-bf9b-60e150b429ae";
                                editor.propretyType = {};
                                break;
                            case "Textarea": editor.dataType = "c6bac0dd-4ab9-45b1-8e30-e4b619ee5da3";
                                editor.propretyType = {};
                                break;
                            case "Rich Text Editor": editor.dataType = "ca90c950-0aff-4e72-b976-a30b1ac57dad";
                                editor.propretyType = {};
                                break;
                            case "Boolean": editor.dataType = "92897bc6-a5f3-4ffe-ae27-f2e7e33dda49";
                                editor.propretyType = {};
                                break;
                            case "Media Picker": editor.dataType = "93929b9a-93a2-4e2a-b239-d99334440a59";
                                editor.propretyType = {};
                                break;
                            case "Multi Media Picker": editor.dataType = "7e3962cc-ce20-4ffc-b661-5897a894ba7e";
                                editor.propretyType = {};
                                break;
                            case "Content Picker": editor.dataType = "a6857c73-d6e9-480c-b6e6-f15f6ad11125";
                                editor.propretyType = {};
                                break;
                            case "Multi Content Picker":
                                editor.dataType = "";
                                break;
                        }
                    }

                    if (editor.dataType && !editor.$isLoaded) {
                        LeBlenderRequestHelper.getDataType(editor.dataType).then(function (data) {

                            // Get config prevalues
                            var configObj = {};
                            _.each(data.preValues, function (p) {
                                configObj[p.key] = p.value;
                            });

                            // Get config default prevalues
                            var defaultConfigObj = {};
                            if (data.defaultPreValues) {
                                _.extend(defaultConfigObj, data.defaultPreValues);
                            }

                            // Merge prevalue and default prevalues
                            var mergedConfig = _.extend(defaultConfigObj, configObj);

                            editor.$isLoaded = true;
                            editor.propretyType.config = mergedConfig;
                            editor.propretyType.view = umbPropEditorHelper.getViewPath(data.view);
                        });
                    }
                    else {
                        editor.$isLoaded = true;
                    }
                })
            }

            /***************************************/
            /* load global dataType Info */
            /***************************************/
            if ($scope.config.globalEditors) {
                _.each($scope.config.globalEditors, function (editor, editorIndex) {

                    if (!$scope.model.global.propretyType) {
                        $scope.model.global.propretyType = {};
                    }

                    /***************************************/
                    /* legacy adaptor 0.9.15 */
                    /***************************************/
                    if (!editor.dataType && editor.propretyType) {
                        switch (editor.propretyType.name) {
                            case "Textstring": editor.dataType = "0cc0eba1-9960-42c9-bf9b-60e150b429ae";
                                editor.propretyType = {};
                                break;
                            case "Textarea": editor.dataType = "c6bac0dd-4ab9-45b1-8e30-e4b619ee5da3";
                                editor.propretyType = {};
                                break;
                            case "Rich Text Editor": editor.dataType = "ca90c950-0aff-4e72-b976-a30b1ac57dad";
                                editor.propretyType = {};
                                break;
                            case "Boolean": editor.dataType = "92897bc6-a5f3-4ffe-ae27-f2e7e33dda49";
                                editor.propretyType = {};
                                break;
                            case "Media Picker": editor.dataType = "93929b9a-93a2-4e2a-b239-d99334440a59";
                                editor.propretyType = {};
                                break;
                            case "Multi Media Picker": editor.dataType = "7e3962cc-ce20-4ffc-b661-5897a894ba7e";
                                editor.propretyType = {};
                                break;
                            case "Content Picker": editor.dataType = "a6857c73-d6e9-480c-b6e6-f15f6ad11125";
                                editor.propretyType = {};
                                break;
                            case "Multi Content Picker":
                                editor.dataType = "";
                                break;
                        }
                    }

                    if (editor.dataType && !editor.$isLoaded) {
                        LeBlenderRequestHelper.getDataType(editor.dataType).then(function (data) {

                            // Get config prevalues
                            var configObj = {};
                            _.each(data.preValues, function (p) {
                                configObj[p.key] = p.value;
                            });

                            // Get config default prevalues
                            var defaultConfigObj = {};
                            if (data.defaultPreValues) {
                                _.extend(defaultConfigObj, data.defaultPreValues);
                            }

                            // Merge prevalue and default prevalues
                            var mergedConfig = _.extend(defaultConfigObj, configObj);

                            editor.$isLoaded = true;
                            editor.propretyType.config = mergedConfig;
                            editor.propretyType.view = umbPropEditorHelper.getViewPath(data.view);
                        });
                    }
                    else {
                        editor.$isLoaded = true;
                    }
                })
            }

            /***************************************/

            //}

        }

        $scope.updateTemplate = function () {

            $scope.SetGlobal();

            // Clean for fixed config
            if ($scope.model.value.length < $scope.config.min) {
                while ($scope.model.value.length < $scope.config.min) {
                    $scope.add();
                }
            }
            if ($scope.model.value.length > $scope.config.max) {
                while ($scope.model.value.length > $scope.config.max) {
                    $scope.remove($scope.model.value.length - 1);
                }
            }
            if ($scope.config.max == $scope.config.min) {
                $scope.fixed = true;
            }

        }

        $scope.updateTemplate();


        $scope.updateEditor();

        $scope.save = function () {

            $scope.$broadcast("formSubmitting");
            if ($scope.validate()) {
                $timeout(function () {
                    $scope.submit({ value: $scope.model.value, global: $scope.model.global });
                }, 250);
            }

        }



        $scope.validateProperty = function (property) {

            if (property.validation.mandatory && !property.value)
                return false;

            delete property.validation.regexFailed;

            if (property.validation.regex && property.validation.regex != "") {
                var regEx = new RegExp(property.validation.regex);
                if (regEx.test(property.value) == false) {
                    property.validation.regexFailed = true;
                    return false;
                }
            }


            return true;




        }

        $scope.validate = function () {
            failed = false;
            _.each($scope.model.global, function (item, itemIndex) {
                _.each(item, function (property, propertyIndex) {
                    if (!$scope.validateProperty(property)) {
                        failed = true;
                    }
                })
            })

            $scope.model.isValid = !failed;
            return !failed;




        }

        
        $scope.ResolveProperties = function (editorKeys, editors, item) {

            var itemKeys = Object.keys(item);

            var propertiesToDelete = $.grep(itemKeys, function (el) { return $.inArray(el, editorKeys) == -1 });
            _.each(propertiesToDelete, function (delProp, delPropIndex) {
                delete item[delProp];
            });

            var propertiesToAdd = $.grep(editorKeys, function (el) { return $.inArray(el, itemKeys) == -1 });


            _.each(propertiesToDelete, function (delProp, delPropIndex) {
                delete item[delProp];
            });


            if (propertiesToAdd.length != 0)
            {
                _.each(editors, function (editor, editorIndex) {
                    if ($.inArray(editor.alias, propertiesToAdd) != -1)
                    {
                        item[editor.alias] = $scope.NewProperty(editor, editorIndex, item);
                    }
                });
            }
        }


         
        var valueEditorKeys = [];
        _.each($scope.config.editors, function (editor, editorIndex) {
            valueEditorKeys.push(editor.alias);
        });


        var globalEditorKeys = [];
        _.each($scope.config.globalEditors, function (editor, editorIndex) {
            globalEditorKeys.push(editor.alias);
        });
         
        //if new properties have been added in the editor, add them to value, if they hav been removed, delete from item value
        _.each($scope.model.value, function (item, itemIndex) {
            $scope.ResolveProperties(valueEditorKeys, $scope.config.editors, item);
        });

        //if new properties have been added in the editor, add them to value, if they hav been removed, delete from global value
        _.each($scope.model.global, function (item, itemIndex) {
            $scope.ResolveProperties(globalEditorKeys, $scope.config.globalEditors, item);
        });

        // Load css asset
        assetsService.loadCss("/App_Plugins/LeBlender/editors/leblendereditor/assets/parameterconfig.css");

    });