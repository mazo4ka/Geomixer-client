var nsGmx = nsGmx || {};

(function() {
    window._translationsHash.addtext('rus', {
        gridPlugin: {
            gridSettings : 'Настройка координатной сетки',
            gridColorSettings : 'Цвет сетки',
            gridStepSettings : 'Шаг сетки',
            set : 'установить',
            reset : 'сбросить',
            unitsKilometers : 'км',
            unitsDegrees : 'градусы',
            latitude : 'по широте',
            longitude : 'по долготе'
        }
    });
    window._translationsHash.addtext('eng', {
        gridPlugin: {
            gridSettings : 'Coordinate grid settings',
            gridColorSettings : 'Grid color',
            gridStepSettings : 'Grid step',
            set : 'set',
            reset : 'reset',
            unitsKilometers : 'km',
            unitsDegrees : 'degrees',
            latitude : 'latitude',
            longitude : 'longitude'
        }
    });

    // создает левое меню с параметрами координатной сетки
    var ConfigureGridMenu = function (manager, control) {
        var configDialog,
            tempStyle = {
                outline: {
                    color: control.options.color
                }
            },
            lm = new window.leftMenu();

        // заполняем левое меню
        function createGridLeftMenu() {
            var gridConfigLeftMenu = nsGmx.Utils._div(null, [['dir','className','gridConfigLeftMenu']]);
            createGridConfig(gridConfigLeftMenu);

            return gridConfigLeftMenu;
        }

        // создание элементов отображения настроек сетки
        function createGridConfig(menu) {
            var gridConfigCanvas = nsGmx.Utils._div(null, [['dir','className','gridSettings']]),
                gridConfigTitle = nsGmx.Utils._span(null, [['dir','className','gridSettingsTitle']]),
                gridConfigIcon = CreateGridConfigIcon(tempStyle, 'linestring');

            $(gridConfigTitle).append(window._gtxt('gridPlugin.gridSettings'));
            $(gridConfigCanvas).append(gridConfigIcon, gridConfigTitle);
            $(menu).append(gridConfigCanvas);

            gridConfigIcon.onclick = function () {
                createConfigDialog(this);
            };
        }

        // диалоговое окно для редактирования координатной сетки
        function createConfigDialog(elem) {
            if (configDialog) {
                return;
            }
            var map = nsGmx.leafletMap,
                gridConfigEditor = nsGmx.Utils._div(null, [['dir','className','gridConfigEditor']]);

            // редактирование цвета сетки - колорпикер
            var fcp = nsGmx.Controls.createColorPicker(tempStyle.outline.color,
                function (colpkr) {
                    $(colpkr).fadeIn(500);
                    return false;
                },
                function (colpkr) {
                    $(colpkr).fadeOut(500);
                    $(this).change();
                    return false;
                },
                function (hsb, hex) {
                    tempStyle.outline.color = '#' + hex;
                    fcp.style.backgroundColor = tempStyle.outline.color;
                    control.setColor(tempStyle.outline.color);
                    $(elem).find('.borderIcon')[0].style.borderColor = tempStyle.outline.color;
                    manager.saveOptions();
                    $(this).ColorPickerSetColor(tempStyle.outline.color);
                    $(this).change();
                }
            );

            $(fcp).ColorPickerSetColor(tempStyle.outline.color);
            $(fcp).css('background-color', tempStyle.outline.color);

            // редактирования шага сетки
            var gridStepYInputPanel = nsGmx.Utils._span(null, [['dir','className','gridStepConfig']]),
                gridStepXInputPanel = nsGmx.Utils._span(null, [['dir','className','gridStepConfig']]),
                gridStepYInput = nsGmx.Utils._input(null, [['dir','className','gridStepInput']]),
                gridStepXInput = nsGmx.Utils._input(null, [['dir','className','gridStepInput']]),
                gridUnitsConfig = nsGmx.Utils._span(null, [['dir','className','gridStepConfig']]),
                gridStepConfig = nsGmx.Utils._span(null, [['dir','className','gridStepConfig']]),
                gridStepUnitsDegrees = nsGmx.Utils._input(null, [
                    ['dir','id','gridStepUnitsDegrees'],
                    ['attr', 'type', 'radio'],
                    ['attr', 'id', 'gridStepUnitsDegrees'],
                    ['attr', 'name', 'gridStepUnits'],
                    ['attr', 'value', 'degrees']
                ]),
                gridStepUnitsKilometers = nsGmx.Utils._input(null, [
                    ['dir','id','gridStepUnitsKilometers'],
                    ['attr', 'type', 'radio'],
                    ['attr', 'name', 'gridStepUnits'],
                    ['attr', 'value', 'kilometers']
                ]),
                gridSetStepButton = nsGmx.Utils._button([nsGmx.Utils._t(window._gtxt('gridPlugin.set'))], [['dir', 'className', 'gridStepButton']]),
                gridResetStepButton = nsGmx.Utils._button([nsGmx.Utils._t(window._gtxt('gridPlugin.reset'))], [['dir', 'className', 'gridStepButton']]);

            if (control.options.units === 'degrees') {
                gridStepUnitsDegrees.checked = true;
            } else if (control.options.units === 'kilometers') {
                gridStepUnitsKilometers.checked = true;
            }

            function updateInputsValues() {
                gridStepXInput.value = control.options.customStep.x ? Math.round(control.options.customStep.x * 100) / 100 : control.options.defaultStep.x;
                gridStepYInput.value = control.options.customStep.y ? Math.round(control.options.customStep.y * 100) / 100 : control.options.defaultStep.y;
            }

            function handleUnits() {
                var value = this.value;
                if (control.options.units !== value) {
                    control.setUnits(value);
                }
                updateInputsValues();
            }

            gridStepUnitsDegrees.onclick = handleUnits;
            gridStepUnitsKilometers.onclick = handleUnits;

            gridSetStepButton.onclick = function () {
                control.setStep(gridStepXInput.value, gridStepYInput.value);
                updateInputsValues();
            };

            gridResetStepButton.onclick = function () {
                control.clearStep();
                gridStepUnitsDegrees.checked = true;
                updateInputsValues();
            };

            gridStepUnitsDegrees.checked = true;
            updateInputsValues();

            map.on('zoomend', function () {
                control.repaint();
                updateInputsValues();
            });

            $(gridStepYInputPanel).append(
                gridStepYInput,
                nsGmx.Utils._t(window._gtxt('gridPlugin.latitude'))
            );

            $(gridStepXInputPanel).append(
                gridStepXInput,
                nsGmx.Utils._t(window._gtxt('gridPlugin.longitude'))
            );

            $(gridUnitsConfig).append(
              nsGmx.Utils._label(
                  [gridStepUnitsDegrees, nsGmx.Utils._t(window._gtxt('gridPlugin.unitsDegrees'))],
                  [['dir', 'className', 'gridUnitsLabel'], ['attr', 'for', 'gridStepUnitsDegrees']]

              ),
              nsGmx.Utils._label(
                  [gridStepUnitsKilometers, nsGmx.Utils._t(window._gtxt('gridPlugin.unitsKilometers'))],
                  [['dir', 'className', 'gridUnitsLabel'], ['attr', 'for', 'gridStepUnitsKilometers']]
              )
            );

            $(gridStepConfig).append(
                gridSetStepButton,
                gridResetStepButton
            );

            $(gridConfigEditor).append(nsGmx.Utils._table([
                nsGmx.Utils._tbody([
                    nsGmx.Utils._tr([
                        nsGmx.Utils._td([nsGmx.Utils._t(window._gtxt('gridPlugin.gridColorSettings'))], [['css','width','70px']]),
                        nsGmx.Utils._td([fcp])
                    ]),
                    nsGmx.Utils._tr(
                        null, [['dir', 'className', 'bigEmptyTableRow']]
                    ),
                    nsGmx.Utils._tr([
                        nsGmx.Utils._td([nsGmx.Utils._t(window._gtxt('gridPlugin.gridStepSettings'))], [['attr', 'rowspan', '6'], ['css','width','70px']]),
                        nsGmx.Utils._td([gridStepYInputPanel])
                    ]),
                    nsGmx.Utils._tr([
                        nsGmx.Utils._td([gridStepXInputPanel])
                    ]),
                    nsGmx.Utils._tr(
                      null, [['dir', 'className', 'smallEmptyTableRow']]
                    ),
                    nsGmx.Utils._tr([
                        nsGmx.Utils._td([gridUnitsConfig])
                    ]),
                    nsGmx.Utils._tr(
                      null, [['dir', 'className', 'smallEmptyTableRow']]
                    ),
                    nsGmx.Utils._tr([
                        nsGmx.Utils._td([gridStepConfig])
                    ])
                ])
            ], [['dir', 'className', 'gridConfigTable']]));
            var pos = nsGmx.Utils.getDialogPos(elem, false, 0);

            var closeFunc = function () {
                $(gridConfigEditor).find('.colorSelector').each(function() {
                    $('#' + $(this).data('colorpickerId')).remove();
                });
                configDialog = null;
            };

            var params = {
                width: 280,
                height: 200,
                posX: pos.left,
                posY: pos.top,
                resizeFunc: false,
                closeFunc: closeFunc
            };

            configDialog = nsGmx.Utils.showDialog(window._gtxt('gridPlugin.gridSettings'), gridConfigEditor, params);
        }

        // создание иконки редактирования стиля
        function CreateGridConfigIcon(style, type) {
            var icon = nsGmx.Controls.createGeometryIcon(style, type);
            nsGmx.Utils._title(icon, window._gtxt('gridPlugin.gridSettings'));
            return icon;
        }

        this.Load = function () {
            if (lm != null){
                var alreadyLoaded = lm.createWorkCanvas('mapGrid', this.Unload);
                if (!alreadyLoaded) {
                    $(lm.workCanvas).append(createGridLeftMenu());
                    control.setColor(tempStyle.outline.color);
                    manager.saveOptions();
                }
            }
        }
        this.Unload = function () {};
    }

    var publicInterface = {
        pluginName: 'GridPlugin',
        ConfigureGridMenu: ConfigureGridMenu
  };

    window.gmxCore.addModule('GridPlugin',
        publicInterface,
        {css: 'src/GridPlugin/GridPlugin.css'}
    );
})();
