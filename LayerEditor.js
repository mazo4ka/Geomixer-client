﻿//Создание интерфейса редактирования свойств слоя
!function($){

var ColumnsModel = Backbone.Model.extend({
    defaults: {
        XCol: null,
        YCol: null
    }
});

/** Виджет для выбора полей для X и Y координат из списка полей
* @function
* @param parent {DOMElement} - контейнер для размещения виджета
* @param params {object} - параметры ф-ции
*   - fields {array of string}- явный список полей
*   - defaultX {string} - дефолтное значение поля X (не обязятелен)
*   - defaultY {string} - дефолтное значение поля Y (не обязятелен)
*/
var SelectColumnsWidget = function(parent, colums, sourceColumns)
{
    //var fields = params.fields;
    var updateWidget = function() {
        var parsedColumns = parseColumns(sourceColumns);
	
        if (!parsedColumns.geomCount && parsedColumns.coordFields.length) {
            var fields = parsedColumns.coordFields;
            
			var selectLat = nsGmx.Utils._select(null, [['attr','selectLat',true],['dir','className','selectStyle'],['css','width','150px'],['css','margin','0px']]),
				selectLon = nsGmx.Utils._select(null, [['attr','selectLon',true],['dir','className','selectStyle'],['css','width','150px'],['css','margin','0px']]);
                
            selectLat.onchange = function() {
                colums.set('YCol', this.value);
            }
            
            selectLon.onchange = function() {
                colums.set('XCol', this.value);
            }

			for (var i = 0; i < fields.length; i++)
			{
				var opt = _option([_t(fields[i])], [['attr','value',fields[i]]]);
		
				_(selectLat, [opt.cloneNode(true)]);
				_(selectLon, [opt.cloneNode(true)]);
            }

            _(parent, [_table([_tbody([
                _tr([
                    _td([_span([_t(_gtxt("Y (широта)"))],[['css','margin','0px 3px']])], [['css','width','73px'],['css','border','none']]), 
                    _td([selectLat], [['css','width','150px'],['css','border','none']])
                ]),
                _tr([
                    _td([_span([_t(_gtxt("X (долгота)"))],[['css','margin','0px 3px']])], [['css','width','73px'],['css','border','none']]), 
                    _td([selectLon], [['css','width','150px'],['css','border','none']])
                ])
            ])])]);
	
	
            if (colums.get('XCol')) {
                selectLon = switchSelect(selectLon, colums.get('XCol'));
            }
	
            if (colums.get('YCol')) {
                selectLat = switchSelect(selectLat, colums.get('YCol'));
		}
	
        } else {
        removeChilds(parent);
        }
    }
        
    updateWidget();
        
    this.updateColumns = function(newFields) {
        fields = newFields;
        updateWidget();
    }
}

var parseColumns = function(fields)
{
    var geomCount = 0; //кол-во колонок с типом Геометрия
    var coordFields = []; //колонки, которые могут быть использованы для выбора координат
    var dateFields = []; //колонки, которые могут быть использованы для выбора временнОго параметра
        
    fields = fields || [];
        
    for (var f = 0; f < fields.length; f++)
    {
        var type = fields[f].ColumnSimpleType.toLowerCase();
        if ( type === 'geometry')
            geomCount++;
            
        if ((type === 'string' || type === 'integer' || type === 'float') && !fields[f].IsIdentity && !fields[f].IsPrimary)
            coordFields.push(fields[f].Name);
            
        if (type === 'date' || type === 'datetime')
            dateFields.push(fields[f].Name);
    }
    
    return { geomCount: geomCount, coordFields: coordFields, dateFields: dateFields };
}

var getSourceColumns = function(name, doNotParse)
{
    var deferred = $.Deferred();
    sendCrossDomainJSONRequest(serverBase + "VectorLayer/GetSourceColumns.ashx?SourceName=" + encodeURIComponent(name), function(response)
    {
        if (!parseResponse(response))
        {
            deferred.reject();
            return;
        }
        
        if (doNotParse) {
            deferred.resolve(response.Result);
        } else {
        var parsedColumns = parseColumns(response.Result);
        deferred.resolve(parsedColumns.geomCount == 0, parsedColumns.coordFields, parsedColumns.dateFields);
        }
    })
    
    return deferred.promise();
}

var getFileExt = function(path)
{
    return String(path).substr(String(path).lastIndexOf('.') + 1, path.length);
}

//events: newAttribute, delAttribute, updateAttribute, change
var ManualAttrModel = function() {
    var _attributes = [];
    
    this.addAttribute = function(type, name)
    {
        _attributes.push({type: type, name: name});
        $(this).triggerHandler('newAttribute');
        $(this).triggerHandler('change');
    };
        
    this.changeName = function(idx, newName)
        {
        _attributes[idx].name = newName;
        $(this).triggerHandler('updateAttribute');
        $(this).triggerHandler('change');
    };
        
    this.changeType = function(idx, newType)
        {
        _attributes[idx].type = newType;
        $(this).triggerHandler('updateAttribute');
        $(this).triggerHandler('change');
    };
    
    this.deleteAttribute = function(idx)
            {
        //delete _attributes[idx];
        _attributes.splice(idx, 1);
        $(this).triggerHandler('delAttribute');
        $(this).triggerHandler('change');
    };
            
    this.getAttribute = function(idx){ return _attributes[idx]; };
    this.getCount = function(){ return _attributes.length; };
    this.each = function(callback) { 
        for (var k = 0; k < _attributes.length; k++)
            callback(_attributes[k], k);
    }
};

ManualAttrModel.TYPES = {
    DOUBLE:   {user: 'Float',    server: 'float'    },
    INTEGER:  {user: 'Integer',  server: 'integer'  },
    STRING:   {user: 'String',   server: 'string'   },
    TIME:     {user: 'Time',     server: 'time'     },
    DATE:     {user: 'Date',     server: 'date'     },
    DATETIME: {user: 'DateTime', server: 'datetime' },
    INTEGER:  {user: 'Integer',  server: 'integer'  },
    BOOL:     {user: 'Boolean',  server: 'boolean'  }
};

var ManualAttrView = function()
{
    var _parent = null;
    var _model = null;
    var _trs = [];
                
    var createTypeSelector = function()
    {
        var s = nsGmx.Utils._select(null, [['css', 'width', '83px'], ['dir', 'className', 'selectStyle']]);
        for (var type in ManualAttrModel.TYPES)
            $(s).append(_option([_t(ManualAttrModel.TYPES[type].user)], [['dir', 'attrType', ManualAttrModel.TYPES[type]], ['attr', 'id', ManualAttrModel.TYPES[type].server]]));
        return s;
            }
            
    var redraw = function()
    {
        if (!_model) return;
        
        $(_parent).empty();
        _trs = [];
        
        for (var i = 0; i < _model.getCount(); i++)
        {
            var attr = _model.getAttribute(i);
            
            var typeSelector = createTypeSelector();
            typeSelector.attrIdx = i;
            $('#' + attr.type.server, typeSelector).attr('selected', 'selected');
            
            $(typeSelector).bind('change', function()
            {
                var attrType = $('option:selected', this)[0].attrType;
                _model.changeType(this.attrIdx, attrType);
            });
            
            var nameSelector = _input(null, [['attr', 'class', 'customAttrNameInput inputStyle'], ['css', 'width', '80px']]);
        
            $(nameSelector).attr({attrIdx: i}).val(attr.name);
            
            $(nameSelector).bind('keyup', function()
        {
                var idx = $(this).attr('attrIdx');
                var name = $(this).val();
                
                _model.changeName(idx, name);
            });
            
            var deleteIcon = makeImageButton("img/close.png", "img/close_orange.png");
            deleteIcon.attrIdx = i;
            deleteIcon.onclick = function()
            {
                _model.deleteAttribute(this.attrIdx);
            }
                
            var moveIcon = _img(null, [['attr', 'src', "img/moveIcon.gif"], ['dir', 'className', 'moveIcon'], ['css', 'cursor', 'move'], ['css', 'width', '13px']]);
                
            _trs.push(_tr([_td([nameSelector]), _td([typeSelector]), _td([deleteIcon]), _td([moveIcon])]));
            }
            
        var tbody = _tbody(_trs);
        $(tbody).sortable({axis: 'y', handle: '.moveIcon'});
        $(_parent).append(_table([tbody], [['dir', 'className', 'customAttributes']]));
        }
        
    this.init = function(parent, model)
        {
        _parent = parent;
        _model = model;
        $(_model).bind('newAttribute', function(idx)
            {
            redraw();
        });
                
        $(_model).bind('delAttribute', function()
        {
            redraw();
        });
        
        $(_model).bind('updateAttribute', function()
        {
            //alert('change');
        });
        
        redraw();
            }
};

var LayerProperties = Backbone.Model.extend({
    initialize: function(type, divProperties, layerProperties) {
        if (!divProperties && !layerProperties) {
            this.attributes = nsGmx._.clone(type);
            return;
        }
            
        this.set({
            Type:           type,
            Title:          divProperties ? (divProperties.title || '') : (layerProperties.Title || ''),
            Copyright:      divProperties ? (divProperties.Copyright || '') : (layerProperties.Copyright || ''),
            Legend:         divProperties ? (divProperties.Legend || '') : (layerProperties.Legend || ''),
            Description:    divProperties ? (divProperties.description || '') : (layerProperties.Description || ''),
            NameObject:     divProperties ? (divProperties.NameObject || '') : (layerProperties.NameObject || ''),
            AllowSearch:    divProperties ? (divProperties.AllowSearch || false) : (layerProperties.AllowSearch || false),
            GeometryType:   divProperties.GeometryType,
            LayerID:        divProperties.LayerID,
            MetaProperties: layerProperties.MetaProperties || {},
            ShapePath:      layerProperties.ShapePath || {},
            TilePath:       layerProperties.TilePath || {},
            Name:           layerProperties.name,
            EncodeSource:   layerProperties.EncodeSource,
            SourceColumns:  layerProperties.SourceColumns,
            TableName:      layerProperties.TableName,
            TableCS:        layerProperties.TableCS,
            SourceType:     layerProperties.SourceType || 'file',
            Geometry:       layerProperties.Geometry,
            
            Attributes:     divProperties.attributes,
            AttrTypes:      divProperties.attrTypes,
            
            UserAttr:              null,
            MetaPropertiesEditing: null
        })
        
        this.set('RC', new nsGmx.LayerRCProperties({
            IsRasterCatalog:      divProperties.IsRasterCatalog,
            RCMinZoomForRasters:  layerProperties.RCMinZoomForRasters,
            RCMaskForRasterTitle: layerProperties.RCMaskForRasterTitle,
            RCMaskForRasterPath:  layerProperties.RCMaskForRasterPath,
            ColumnTagLinks:       layerProperties.ColumnTagLinks
        }));
        
        var tempPeriods = divProperties.TemporalPeriods;
        this.set('Temporal', new nsGmx.TemporalLayerParams({
            isTemporal: !!divProperties.Temporal,
            minPeriod: tempPeriods && tempPeriods[0],
            maxPeriod: tempPeriods && tempPeriods[tempPeriods.length-1],
            columnName: divProperties.TemporalColumnName
        }));
        
        this.set('SelectedColumns', new ColumnsModel({
            XCol: layerProperties.GeometryXCol,
            YCol: layerProperties.GeometryYCol
        }));
        
        if (type !== 'Vector') {
            this.set("Legend", divProperties ? (divProperties.Legend || '') : (layerProperties.Legend || ''));
        }
        
        if (layerProperties.Name) {
            this.set("Name", layerProperties.Name);
        }
    }
})

var createPageMain = function(parent, layerProperties) {

    var title = _input(null,[['attr','fieldName','title'],['attr','value',layerProperties.get('Title')],['dir','className','inputStyle'],['css','width','220px']]);
    title.onkeyup = function() {
        layerProperties.set('Title', this.value);
            return true;
        }
        
    layerProperties.on('change:Title', function() {
        var newTitle = layerProperties.get('Title');
        if ( newTitle !== title.value ) {
            title.value = newTitle;
        }
    })
        
    var copyright = _input(null,[['attr','fieldName','copyright'],['attr','value',layerProperties.get('Copyright')],['dir','className','inputStyle'],['css','width','220px']]);
    copyright.onkeyup = function() {
        layerProperties.set('Copyright', this.value);
        return true;
    }
            
    var legend = _input(null,[['attr','fieldName','Legend'],['attr','value',layerProperties.get('Legend')],['dir','className','inputStyle'],['css','width','220px']])
    legend.onkeyup = function() {
        layerProperties.set('Legend', this.value);
        return true;
    }
                
    var descr = _textarea(null,[
        ['attr','fieldName','description'],
        ['dir','className','inputStyle'],
        ['css','width','220px'],
        ['css','height','50px']
    ]);
                
    descr.onkeyup = function() {
        layerProperties.set('Description', this.value);
        return true;
            }
            
    descr.value = layerProperties.get('Description');
    
    var boxSearch = _checkbox(layerProperties.get('AllowSearch'), 'checkbox');
    boxSearch.setAttribute('fieldName', 'AllowSearch');
    boxSearch.className = 'box';
    boxSearch.style.marginLeft = '3px';

    boxSearch.onclick = function()
    {
        layerProperties.set('AllowSearch', this.checked);
            return true;
        }
        
        var shownProperties = [];
            
        shownProperties.push({name: _gtxt("Имя"), field: 'Title', elem: title});
        shownProperties.push({name: _gtxt("Копирайт"), field: 'Copyright', elem: copyright});
        
    if (layerProperties.get('Name')) {
            shownProperties.push({name: _gtxt("ID"), field: 'Name'});
        shownProperties.push({name: _gtxt("Разрешить поиск"), elem: boxSearch});
    }
                                
        shownProperties.push({name: _gtxt("Описание"), field: 'Description', elem: descr});
        
    if (layerProperties.get('Type') != "Vector")
            shownProperties.push({name: _gtxt("Легенда"), field: 'Legend', elem: legend});
        
    var trs = _mapHelper.createPropertiesTable(shownProperties, layerProperties.attributes, {leftWidth: 70});
    _(parent, [_div([_table([_tbody(trs)],[['dir','className','propertiesTable']])])]);
}

var createPageVectorSource = function(parent, layerProperties) {
    var shownProperties = [];
    var layerName = layerProperties.get('Name');
        
    if (layerProperties.get('Type') === 'Vector') {
        
        /*------------ Источник: файл ------------*/
        var shapePath = layerProperties.get('ShapePath');
        
        var shapePathInput = _input(null,[['attr','fieldName','ShapePath.Path'],['attr','value', shapePath.Path || ''],['dir','className','inputStyle'],['css','width', '200px']]),
            shapeFileLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
            encodingParent = _div(),
            xlsColumnsParent = _div();
        
        shapePathInput.onkeyup = shapePathInput.onchange = function() {
            layerProperties.set('ShapePath', {Path: this.value});
        }
        
        var fileSourceColumns = layerProperties.get('SourceType') === 'file' ? layerProperties.get('SourceColumns') : [];
        var fileSelectedColumns = layerProperties.get('SourceType') === 'file' ? layerProperties.get('SelectedColumns') : new ColumnsModel();
        var fileColumnsWidget = new SelectColumnsWidget(xlsColumnsParent, fileSelectedColumns, fileSourceColumns);
        
        shapeFileLink.style.marginLeft = '3px';
        
        var encodingWidget = new nsGmx.ShpEncodingWidget();
        shapePathInput.oldValue = shapePathInput.value;
            
        $(encodingWidget).change(function() {
            layerProperties.set('EncodeSource', encodingWidget.getServerEncoding());
        })
            
        if (getFileExt(shapePathInput.value) === 'shp') {
            encodingWidget.drawWidget(encodingParent, layerProperties.get('EncodeSource'));
            }
            
        if (shapePath && shapePath.Path != null && shapePath.Path != '' && !shapePath.Exists) {
            $(shapePathInput).addClass('error');
        }
            
        //TODO: использовать события модели
            shapeFileLink.onclick = function()
            {
                _fileBrowser.createBrowser(_gtxt("Файл"), ['shp','tab', 'xls', 'xlsx', 'xlsm', 'mif', 'gpx', 'kml'], function(path)
                {
                shapePathInput.value = path;
                layerProperties.set('ShapePath', {Path: path});
                    
                    var index = String(path).lastIndexOf('.'),
                        ext = String(path).substr(index + 1, path.length);
                    
                if (layerProperties.get('Title') == '')
                    {
                        var indexSlash = String(path).lastIndexOf('\\'),
                            fileName = String(path).substring(indexSlash + 1, index);
                        
                    layerProperties.set('Title', fileName);
                    }
                    
                getSourceColumns(path, true).done(function(sourceColumns)
                    {
                    layerProperties.set('SourceColumns', sourceColumns);
                    fileSourceColumns = sourceColumns;
                    })
                    
                    $(encodingParent).empty();
                    if (ext === 'shp')
                    {
                        encodingWidget.drawWidget(encodingParent);
                    }
                })
            }
            
        var sourceFile = _div(null, [['dir', 'id', 'fileSource' + layerName]]);
        _(sourceFile, [shapePathInput, shapeFileLink, encodingParent, xlsColumnsParent]);
        
        /*------------ Источник: таблица ------------*/
        var tableLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
            tableColumnsParent = _div();
            
        var tableSourceColumns   = layerProperties.get('SourceType') === 'table' ? layerProperties.get('SourceColumns') : [];
        var tableSelectedColumns = layerProperties.get('SourceType') === 'table' ? layerProperties.get('SelectedColumns') : new ColumnsModel();
        var tableColumnsWidget = new SelectColumnsWidget(tableColumnsParent, tableSelectedColumns, tableSourceColumns);
            
        var tablePathInput = _input(null,[
            ['attr','fieldName','TableName'],
            ['attr','value', layerProperties.get('TableName') || ''],
            ['dir','className','inputStyle'],
            ['css','width', '200px']
        ]);
        
        tablePathInput.onkeyup = tablePathInput.onchange = function() {
            layerProperties.set('TableName', this.value);
        }
            
            tableLink.onclick = function()
            {
                _tableBrowser.createBrowser(function(name)
                {
                tablePathInput.value = name;
                layerProperties.set('TableName', name);
                    
                if (layerProperties.get('Title') == '') {
                    layerProperties.set('Title', name);
                }
                    
                getSourceColumns(name, true).done(function(sourceColumns)
                    {
                    layerProperties.set('SourceColumns', sourceColumns);
                    tableSourceColumns = sourceColumns;
                    })
                })
            }

            tableLink.style.marginLeft = '3px';

         var TableCSParent = _div();
            var TableCSSelect = $('<select/>', {'class': 'selectStyle'}).css('width', '165px')
                .append($('<option>').val('EPSG:4326').text(_gtxt('Широта/Долгота (EPSG:4326)')))
                .append($('<option>').val('EPSG:3395').text(_gtxt('Меркатор (EPSG:3395)')))
                .change(function() {
                    layerProperties.set('TableCS', $(this).find(':selected').val());
                })
                    
            if (layerProperties.get('TableCS')) {
                TableCSSelect.find('[value="' + layerProperties.get('TableCS') +'"]').attr('selected', 'selected');
                }
                
            $(TableCSParent).append($('<span/>').text(_gtxt('Проекция')).css('margin', '3px')).append(TableCSSelect);
            
        var sourceTable = _div([tablePathInput, tableLink, TableCSParent, tableColumnsParent], [['dir', 'id', 'tableSource' + layerName]])
            
        /*------------ Источник: вручную ------------*/
            var addAttribute = makeLinkButton(_gtxt("Добавить атрибут"));
        var attrModel = new ManualAttrModel();
            addAttribute.onclick = function()
            {
            attrModel.addAttribute(ManualAttrModel.TYPES.STRING, "NewAttribute");
            }
            
        var geometryTypes = [
            { title: _gtxt('многоугольники'), type: 'POLYGON'    },
            { title: _gtxt('линии'),          type: 'LINESTRING' },
            { title: _gtxt('точки'),          type: 'POINT'      }
        ];
            
        var geometryTypeSelect = $('<select/>', {'class': 'selectStyle'}).css('width', '110px');
        for (var g = 0; g < geometryTypes.length; g++)
            $('<option/>').text(geometryTypes[g].title).val(geometryTypes[g].type).appendTo(geometryTypeSelect);
                
        if (layerProperties.get('GeometryType')) {
            geometryTypeSelect.find($("[value='" + layerProperties.get('GeometryType').toUpperCase() + "']").attr("selected", "selected"));
        } else {
            layerProperties.set('GeometryType', $('option', geometryTypeSelect)[0].value);
                }
                
        geometryTypeSelect.change(function() {
            layerProperties.set('GeometryType', $('option:selected', this).val());
        })
                    
        var attrViewParent = _div();
        var attrContainer = _div([
            _div([
                _div([_span([_t('Геометрия: ')], [['css', 'height', '20px'], ['css', 'verticalAlign', 'middle']]), geometryTypeSelect[0]]),
                addAttribute
            ]),
            _div([attrViewParent], [['css', 'margin', '3px']])
        ], [['css', 'marginLeft', '3px']]);
                    
        //заполняем поля по атрибутам объекта
        //TODO: вынести в модель?
        if ( layerProperties.get('SourceType') === 'manual' ) {
            var attrs = layerProperties.get('Attributes');
            var attrTypes = layerProperties.get('AttrTypes');
            nsGmx._.each(attrs, function(elem, index) {
                var serverType = attrTypes[index];
                var attrModelType = nsGmx._.find(ManualAttrModel.TYPES, function(elem) {return elem.server === serverType});
                attrModel.addAttribute(attrModelType, elem);
            })
        }
                        
        var attrView = new ManualAttrView();
        attrView.init(attrViewParent, attrModel);
                        
        layerProperties.set('UserAttr', attrModel);
                        
        var sourceManual = _div([attrContainer], [['dir', 'id', 'manualSource' + layerName]]);
                        
        function capitaliseFirstLetter(string)
                        {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
                            
        var updateColumnsByManual = function() {
            var sourceColumns = [];
            attrModel.each(function(attr) {
                sourceColumns.push({ Name: attr.name, ColumnSimpleType: capitaliseFirstLetter(attr.type.server), IsPrimary: false, IsIdentity: false, IsComputed: false });
            })
                        
            layerProperties.set('SourceColumns', sourceColumns);
                        }
                        
        $(attrModel).change(updateColumnsByManual);
                        
        if (layerProperties.get('SourceType') === 'manual') {
            updateColumnsByManual();
                    }
                    
        /*------------ Общее ------------*/
        layerProperties.on({
            'change:SourceColumns': function() {
                //var parsedColumns = parseColumns(layerProperties.get('SourceColumns'));
                var sourceColumns = layerProperties.get('SourceColumns');
                tableColumnsWidget.updateColumns(sourceColumns);
                fileColumnsWidget.updateColumns(sourceColumns);
                }
        })
                        
        /*------------ Переключалка источника слоя ------------*/
        var sourceContainers = [sourceFile, sourceTable, sourceManual];
                        
            var sourceCheckbox = $('<form/>')
                .append($('<input/>', {type: 'radio', name: 'sourceCheckbox', id: 'chxFileSource', checked: 'checked'}).data('containerIdx', 0))
                .append($('<label/>', {'for': 'chxFileSource'}).text(_gtxt('Файл'))).append('<br/>')
                .append($('<input/>', {type: 'radio', name: 'sourceCheckbox', id: 'chxTableSource'}).data('containerIdx', 1))
                .append($('<label/>', {'for': 'chxTableSource'}).text(_gtxt('Таблица'))).append('<br/>')
                .append($('<input/>', {type: 'radio', name: 'sourceCheckbox', id: 'chxManualSource'}).data('containerIdx', 2))
                .append($('<label/>', {'for': 'chxManualSource'}).text(_gtxt('Вручную')));
                
            $(sourceCheckbox).find('input, label').css({verticalAlign: 'middle'});
            $(sourceCheckbox).find('label').css({marginLeft: 2});
                
            var sourceTab2 = $('<div/>');
            var sourceTr2 = _tr([_td([sourceCheckbox[0]], [['css','padding','5px'], ['css', 'verticalAlign', 'top'], ['css', 'lineHeight', '18px']]), _td([sourceTab2[0]])]);
            
            sourceCheckbox.find('input').click(function()
            {
                var activeIdx = $(this).data('containerIdx');
                $(sourceTab).tabs('select', activeIdx);
            });
            
        var activeCheckboxID = {'file': 'chxFileSource', 'table': 'chxTableSource', 'manual': 'chxManualSource'}[layerProperties.get('SourceType')];
        $('#' + activeCheckboxID, sourceCheckbox).attr('checked', 'checked');
        
            var sourceTab = _div([_ul([
            _li([_a([_t(_gtxt('Файл'))],   [['attr','href','#fileSource' + layerName]])]),
            _li([_a([_t(_gtxt('Таблица'))],[['attr','href','#tableSource' + layerName]])]),
            _li([_a([_t(_gtxt('Вручную'))],[['attr','href','#manualSource' + layerName]])])
            ], [['css', 'display', 'none']])]);

        var selectedSource = {'file': 0, 'table': 1, 'manual': 2}[layerProperties.get('SourceType')];
        _(sourceTab, sourceContainers);
            
                $(sourceTab).tabs({
                    selected: selectedSource,
                    select: function(event, ui)
                    {
                        selectedSource = ui.index;
                
                if (selectedSource == 0) {
                    layerProperties.set('SourceColumns', fileSourceColumns);
                    layerProperties.set('SourceType', 'file');
                    layerProperties.set('SelectedColumns', fileSelectedColumns);
                } else if (selectedSource == 1) {
                    layerProperties.set('SourceColumns', tableSourceColumns);
                    layerProperties.set('SourceType', 'table');
                    layerProperties.set('SelectedColumns', tableSelectedColumns);
                } else if (selectedSource == 2) {
                    updateColumnsByManual();
                    layerProperties.set('SourceType', 'manual');
                    }
            }
                });
        
                _(sourceTab2[0], [sourceTab]);
            
        shownProperties.push({tr: sourceTr2});
    } else {
            
    }    
            
    var trs = _mapHelper.createPropertiesTable(shownProperties, layerProperties.attributes, {leftWidth: 70});
    _(parent, [_div([_table([_tbody(trs)],[['dir','className','propertiesTable']])])]);
}

var createPageRasterSource = function(parent, layerProperties) {
    var shapePath = layerProperties.get('ShapePath');
    var tilePath = layerProperties.get('TilePath');
    var name = layerProperties.get('Name');

    var shapePathInput = _input(null,[['attr','fieldName','ShapePath.Path'],['attr','value',shapePath.Path || ''], ['dir','className','inputStyle'],['css','width','220px']]),
        tilePathInput = _input(null,[['attr','fieldName','TilePath.Path'],['attr','value',tilePath.Path || ''], ['dir','className','inputStyle'],['css','width','220px']]),
                tileCatalogLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
                tileFileLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
                shapeLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
                drawingBorderLink = makeImageButton("img/choose2.png", "img/choose2_a.png"),
        drawingBorderDescr = _span(null, [['attr','id','drawingBorderDescr' + name],['css','color','#215570'],['css','marginLeft','3px']]),
                removeBorder = makeImageButton('img/closemin.png','img/close_orange.png'),
                divBorder = _div([drawingBorderDescr, removeBorder]),
                trPath = _tr([_td([_t(_gtxt("Каталог")), tileCatalogLink, _br(), _t(_gtxt("Файл")), tileFileLink],[['css','paddingLeft','5px'],['css','fontSize','12px']]),
                      _td([tilePathInput])]),
                trShape = _tr([_td([_t(_gtxt("Граница")), shapeLink],[['css','paddingLeft','5px'],['css','fontSize','12px']]),
                        _td([shapePathInput, divBorder])]),
                shapeVisible = function(flag)
                {
                    if (flag)
                    {
                shapePathInput.style.display = '';
                        divBorder.style.display = 'none';
                    }
                    else
                    {
                shapePathInput.style.display = 'none';
                        divBorder.style.display = '';
                    }
                };
            
            divBorder.style.cssText = "height:22px; padding-top:3px;";
            
            removeBorder.style.cssText = "height:16px;padding:0;width:16px;cursor:pointer;margin:-1px 0px -3px 5px;";
            
            _title(removeBorder, _gtxt("Удалить"));
            
            removeBorder.onclick = function()
            {
                shapeVisible(true);
        _mapHelper.drawingBorders.removeRoute(name, true);
            }
            
    if (name)
            {
                _(trShape.firstChild, [_br(), _t(_gtxt("Контур")), drawingBorderLink]);

        if (shapePath.Path)
                    shapeVisible(true);	
                else
                {
                    shapeVisible(false);
                    
            var geometry = layerProperties.get('Geometry');
                    // добавим маленький сдвиг, чтобы рисовать полигон, а не прямоугольник
            geometry.coordinates[0][0][0] += 0.00001;
            geometry.coordinates[0][0][1] += 0.00001;
                    
            // чтобы если бы последняя точка совпадала с первой, то это бы ни на что не повлияло
            var pointCount = geometry.coordinates[0].length;
            geometry.coordinates[0][pointCount-1][0] += 0.00001;
            geometry.coordinates[0][pointCount-1][1] += 0.00001;
                    
            var drawingBorder = globalFlashMap.drawing.addObject(from_merc_geometry(geometry));
                
                    drawingBorder.setStyle({outline: {color: 0x0000FF, thickness: 3, opacity: 80 }, marker: { size: 3 }, fill: { color: 0xffffff }}, {outline: {color: 0x0000FF, thickness: 4, opacity: 100}, marker: { size: 4 }, fill: { color: 0xffffff }});
                    
            _mapHelper.drawingBorders.set(name, drawingBorder);
                    
            _mapHelper.drawingBorders.updateBorder(name, drawingBorderDescr);
                }
            }
            else
                shapeVisible(true);	
            
    if (shapePath && shapePath.Path != null && shapePath.Path != '' && !shapePath.Exists)
        $(shapePathInput).addClass('error');

    if (tilePath.Path != null && tilePath.Path != '' && !tilePath.Exists)
        $(tilePathInput).addClass('error');
            
            tileCatalogLink.onclick = function()
            {
                _fileBrowser.createBrowser(_gtxt("Каталог"), [], function(path)
                {
            tilePathInput.value = path;
            layerProperties.set('TilePath', {Path: path});
                    
            if (!layerProperties.get('Title'))
                    {
                        path = path.substring(0, path.length - 1); //убираем слеш на конце
                        var indexSlash = String(path).lastIndexOf('\\'),
                            fileName = String(path).substring(indexSlash + 1, path.length);
                        
                layerProperties.set('Title', fileName);
                    }
                })
            }
            
            var appendMetadata = function(data)
            {
        var layerTags = layerProperties.get('MetaPropertiesEditing');
                if (!data) return;
                
                var convertedTagValues = {};
                for (var mp in data)
                {
                    var tagtype = data[mp].Type;
                    layerTags.addNewTag(mp, nsGmx.Utils.convertFromServer(tagtype, data[mp].Value), tagtype);
                }
                
        if (!layerProperties.get('Title'))
                {
                    var platform = layerTags.getTagByName('platform');
                    var dateTag  = layerTags.getTagByName('acqdate');
                    var timeTag  = layerTags.getTagByName('acqtime');
                    
                    if (typeof platform !== 'undefined' && typeof dateTag !== 'undefined' && typeof timeTag !== 'undefined')
                    {
                        var timeOffset = (new Date()).getTimezoneOffset()*60*1000;
                        
                        var dateInt = nsGmx.Utils.convertToServer('Date', dateTag.value);
                        var timeInt = nsGmx.Utils.convertToServer('Time', timeTag.value);
                        
                        var date = new Date( (dateInt+timeInt)*1000 + timeOffset );
                        
                        var dateString = $.datepicker.formatDate('yy.mm.dd', date);
                        var timeString = $.datepicker.formatTime('hh:mm', {hour: date.getHours(), minute: date.getMinutes()});
                        
                layerProperties.set('Title', platform.value + '_' + dateString + '_' + timeString + '_UTC');
                    }
                }
            }
            
            tileFileLink.onclick = function()
            {
                _fileBrowser.createBrowser(_gtxt("Файл"), ['jpeg', 'jpg', 'tif', 'png', 'img', 'tiles', 'cpyr'], function(path)
                {
            tilePathInput.value = path;
            layerProperties.set('TilePath', {Path: path});
                    
                    sendCrossDomainJSONRequest(serverBase + 'Layer/GetMetadata.ashx?basepath=' + encodeURIComponent(path), function(response)
                    {
                        if (!parseResponse(response))
                            return;
                            
                        appendMetadata(response.Result.MetaProperties);
                        
                if (!layerProperties.get('Title'))
                        {
                            var indexExt = String(path).lastIndexOf('.');
                            var indexSlash = String(path).lastIndexOf('\\'),
                                fileName = String(path).substring(indexSlash + 1, indexExt);
                            
                    layerProperties.set('Title', fileName);
                        }
                    })
                })
            }
            
            shapeLink.onclick = function()
            {
                _fileBrowser.createBrowser(_gtxt("Граница"), ['mif','tab','shp'], function(path)
                {
            shapePathInput.value = path;
            layerProperties.set('ShapePath', {Path: path});
                    
                    shapeVisible(true);
                    
                    sendCrossDomainJSONRequest(serverBase + 'Layer/GetMetadata.ashx?geometryfile=' + encodeURIComponent(path), function(response)
                    {
                        if (!parseResponse(response))
                            return;
                            
                        appendMetadata(response.Result.MetaProperties);
                    })
                })
            }
            
            drawingBorderLink.onclick = function()
            {
        nsGmx.Controls.chooseDrawingBorderDialog( name, function(polygon)
                {
            _mapHelper.drawingBorders.set(name, polygon);
            _mapHelper.drawingBorders.updateBorder(name);
                    shapeVisible(false);
                    
                }, {geomType: 'POLYGON', errorMessage: _gtxt("$$phrase$$_17")} );
            }
            
            tileCatalogLink.style.marginLeft = '3px';
            tileFileLink.style.marginLeft = '3px';
            shapeLink.style.marginLeft = '3px';
            drawingBorderLink.style.marginLeft = '3px';

    var shownProperties = [];
            shownProperties.push({tr:trPath});
            shownProperties.push({tr:trShape});
    
    var trs = _mapHelper.createPropertiesTable(shownProperties, layerProperties.attributes, {leftWidth: 70});
    _(parent, [_div([_table([_tbody(trs)],[['dir','className','propertiesTable']])])]);
}

var createPageMetadata = function(parent, layerProperties) {
    nsGmx.TagMetaInfo.loadFromServer(function(tagsInfo)
    {
        var convertedTagValues = {};
        
        var metaProperties = layerProperties.get('MetaProperties');
        for (var mp in metaProperties)
        {
            var tagtype = metaProperties[mp].Type;
            convertedTagValues[mp] = {Type: tagtype, Value: nsGmx.Utils.convertFromServer(tagtype, metaProperties[mp].Value)};
        }
        var layerTags = new nsGmx.LayerTags(tagsInfo, convertedTagValues);
        layerProperties.set('MetaPropertiesEditing', layerTags);
        
        var layerTagsControl = new nsGmx.LayerTagSearchControl(layerTags, parent);
    })
}

var createPageAdvanced = function(parent, layerProperties) {
    var nameObjectInput = _input(null,[['attr','fieldName','NameObject'],['attr','value',layerProperties.get('NameObject')],['dir','className','inputStyle'],['css','width','220px']])
    nameObjectInput.onkeyup = function()
    {
        layerProperties.set('NameObject', this.value);
        return true;
    }
        
    var shownProperties = [];
    shownProperties.push({name: _gtxt("Шаблон названий объектов"), elem: nameObjectInput, trclass: 'layer-advanved-options'});
            
    //мультивременной слой
    var temporalLayerParent = _div(null, [['dir', 'className', 'TemporalLayer']]);
    var temporalLayerView = new nsGmx.TemporalLayerParamsControl(temporalLayerParent, layerProperties.get('Temporal'), []);
        
    var updateTemporalColumns = function() {
        var parsedColumns = parseColumns(layerProperties.get('SourceColumns'));
        temporalLayerView.updateColumns(parsedColumns.dateFields);
        }
        
    layerProperties.on('change:SourceColumns', updateTemporalColumns);
    updateTemporalColumns();
        
    shownProperties.push({name: _gtxt("Данные с датой"), elem: temporalLayerParent, trclass: 'layer-advanved-options'});

    //каталог растров
    var rasterCatalogDiv = $('<div/>');

    var rasterCatalogControl = new nsGmx.LayerRasterCatalogControl(rasterCatalogDiv, layerProperties.get('RC'));
    
    shownProperties.push({name: _gtxt("Каталог растров"), elem: rasterCatalogDiv[0], trid: 'RCCreate-container', trclass: 'layer-advanved-options'});
    
    var trs = _mapHelper.createPropertiesTable(shownProperties, layerProperties.attributes, {leftWidth: 70});
    _(parent, [_div([_table([_tbody(trs)],[['dir','className','propertiesTable']])])]);
}

var LayerEditor = function(div, type, properties, treeView, params) {
    var _params = $.extend({addToMap: true, doneCallback: null}, params);
    var tabs = [];
    var divProperties = div ? div.gmxProperties.content.properties : {};
    
    this.getTabs = function() {
        return tabs;
                }
    
    this.getSaveButton = function() {
        return saveButton;
            }
    
    this.done = function(callback) {
        callback();
        }
        
    var layerProperties = new LayerProperties(type, divProperties, properties);
    var origLayerProperties = layerProperties.clone();
                    
    var mainContainer = _div();
    var sourceContainer = _div();
    var metadataContainer = _div();
    var advancedContainer = _div();
    
    createPageMain(mainContainer, layerProperties);
    createPageMetadata(metadataContainer, layerProperties);
    
    if (type === 'Vector') {
        createPageVectorSource(sourceContainer, layerProperties);
        createPageAdvanced(advancedContainer, layerProperties);
    } else {
        createPageRasterSource(sourceContainer, layerProperties);
                }
    
    tabs.push({title: 'Общие', name: 'main', container: mainContainer});
    tabs.push({title: 'Источник', name: 'source', container: sourceContainer});
    tabs.push({title: 'Метаданные', name: 'metadata', container: metadataContainer});
    
    if (type === 'Vector') {
        tabs.push({title: 'Дополнительно', name: 'advanced', container: advancedContainer});
        }
        
            var saveButton = makeLinkButton(div ? _gtxt("Изменить") : _gtxt("Создать"));
            
    if (div) {
        layerProperties.on({
            'change:Title': function() {
                var title =  layerProperties.get('Title');
            
                var span = $(div).find(".layer")[0];
                removeChilds(span);
                _(span, [_t(title)]);

                divProperties.title = title;
                treeView.findTreeElem(div).elem.content.properties = divProperties;
            },
            'change:Copyright': function() {
                var copyright = layerProperties.get('Copyright')
                    
                globalFlashMap.layers[layerProperties.get('Name')].setCopyright(copyright);
                    
                divProperties.Copyright = copyright;
                treeView.findTreeElem(div).elem.content.properties = divProperties;
            },
            'change:Description': function() {
                var description = layerProperties.get('Description');
                    
                var span = $(div).find(".layerDescription")[0];
                removeChilds(span);
                span.innerHTML = description;
                
                divProperties.description = description;
                treeView.findTreeElem(div).elem.content.properties = divProperties;
            },
            'change:Legend': function() {
                divProperties.Legend = layerProperties.get('Legend');
                treeView.findTreeElem(div).elem.content.properties = divProperties;
            },
            'change:NameObject': function() {
                divProperties.NameObject = layerProperties.get('NameObject');
                treeView.findTreeElem(div).elem.content.properties = divProperties;
            },
            'change:AllowSearch': function() {
                divProperties.AllowSearch = layerProperties.get('AllowSearch');
                treeView.findTreeElem(div).elem.content.properties = divProperties;
                    }
        });
                }
                
    saveButton.onclick = function() {
        var mapProperties = _layersTree.treeModel.getMapProperties();
                var metaProperties = {};
        var layerTags = layerProperties.get('MetaPropertiesEditing');
                layerTags.eachValid(function(id, tag, value)
                {
                    var type = layerTags.getTagMetaInfo().getTagType(tag);
                    var value = nsGmx.Utils.convertToServer(type, value);
                    if (value !== null)
                        metaProperties[tag] = {Value: value, Type: type};
                })
                
                var metadataString = '&MetaProperties=' + encodeURIComponent(JSON.stringify(metaProperties));
                
        if (layerProperties.get('Type') === 'Vector') {
                    var cols = '',
                        updateParams = '',
                encoding = layerProperties.get('EncodeSource') ? '&EncodeSource=' + encodeURIComponent(layerProperties.get('EncodeSource')) : '',
                layerTitle = layerProperties.get('Title'),
                        temporalParams = '',
                tableCSParam = layerProperties.get('SourceType') === 'table' ? '&TableCS=' + encodeURIComponent(layerProperties.get('TableCS')) : '',
                        RCParams = '',
                nameObjectParams = layerProperties.get('NameObject') ? '&NameObject=' + encodeURIComponent(layerProperties.get('NameObject')) : '';
                    
            rcProps = layerProperties.get('RC');
                        
            if (rcProps.get('IsRasterCatalog'))
                    {
                        RCParams = '&IsRasterCatalog=true';
                RCParams += '&RCMinZoomForRasters=' + encodeURIComponent(rcProps.get('RCMinZoomForRasters'));
                RCParams += '&RCMaskForRasterPath=' + encodeURIComponent(rcProps.get('RCMaskForRasterPath'));
                RCParams += '&RCMaskForRasterTitle=' + encodeURIComponent(rcProps.get('RCMaskForRasterTitle'));
                RCParams += '&ColumnTagLinks=' + encodeURIComponent(JSON.stringify(rcProps.get('ColumnTagLinks')));
                    }
                    else
                    {
                        RCParams = '&IsRasterCatalog=false';
                    }
                    
            var tempProperties = layerProperties.get('Temporal');
            if ( tempProperties.get('isTemporal') && tempProperties.get('columnName') )
                temporalParams = '&TemporalLayer=true'
                      + '&TemporalColumnName=' + encodeURIComponent(tempProperties.get('columnName'))
                      + '&TemporalPeriods=' + encodeURIComponent(tempProperties.getPeriodString());
                    else
                        temporalParams = '&TemporalLayer=false';
                    
            var selectedColumns = layerProperties.get('SelectedColumns');
            if (selectedColumns.get('XCol') && selectedColumns.get('YCol')) {
                cols = '&ColY=' + encodeURIComponent(selectedColumns.get('YCol')) 
                     + '&ColX=' + encodeURIComponent(selectedColumns.get('XCol'));
            }
                    
            if (layerProperties.get('LayerID'))
                    {
                updateParams = '&VectorLayerID=' + layerProperties.get('LayerID');
                    }
                    
            if (!layerProperties.get('Name') && layerProperties.get('SourceType') === 'manual')
                    {
                var sourceColumns = layerProperties.get('SourceColumns');
                var columnsString = "&FieldsCount=" + sourceColumns.length;
                for (var k = 0; k < sourceColumns.length; k++) {
                    columnsString += "&fieldName" + k + "=" + encodeURIComponent(sourceColumns[k].Name) + "&fieldType" + k + "=" + sourceColumns[k].ColumnSimpleType.toLowerCase();
                        }

                var geomType = layerProperties.get('GeometryType');
                        
                        sendCrossDomainJSONRequest(serverBase + "VectorLayer/CreateVectorLayer.ashx?WrapStyle=func" + 
                    "&Title=" + encodeURIComponent(layerProperties.get('Title')) + 
                    "&Copyright=" + encodeURIComponent(layerProperties.get('Copyright')) + 
                    "&Description=" + encodeURIComponent(layerProperties.get('Description')) + 
                            "&MapName=" + encodeURIComponent(mapProperties.name) + 
                    columnsString + temporalParams +
                            "&geometrytype=" + geomType +
                            metadataString +
                            RCParams + nameObjectParams, 
                            function(response)
                            {
                                if (!parseResponse(response))
                                        return;
                                
                                if (_params.addToMap)
                                {
                                    var targetDiv = $(_queryMapLayers.buildedTree.firstChild).children("div[MapID]")[0];
                                    var gmxProperties = {type: 'layer', content: response.Result};
                                    gmxProperties.content.properties.mapName = mapProperties.name;
                                    gmxProperties.content.properties.hostName = mapProperties.hostName;
                                    gmxProperties.content.properties.visible = true;
                                    
                                    gmxProperties.content.properties.styles = [{
                                        MinZoom: gmxProperties.content.properties.VtMaxZoom,
                                        MaxZoom:21, 
                                        RenderStyle:_mapHelper.defaultStyles[gmxProperties.content.properties.GeometryType]
                                    }];
                                
                                    _layersTree.copyHandler(gmxProperties, targetDiv, false, true);
                                }
                                    
                                //реализует интерфейс AsyncTask
                                //TODO: test me!
                                var taskResult = {Result: response.Result, Completed: true};
                                var task = {
                                    deferred: $.when(taskResult),
                                    getCurrentStatus: function(){return 'completed'; },
                                    getCurrentResult: function(){return taskResult; }
                                }
                                _params.doneCallback && _params.doneCallback(task, response.Result.properties.title);
                            }
                        );
                    }
                    else
                    {
                var dataSource = layerProperties.get('SourceType') === 'file' ? layerProperties.get('ShapePath').Path :  layerProperties.get('TableName');
                var geometryDataSource = "&GeometryDataSource=" + encodeURIComponent(dataSource);
                        
                sendCrossDomainJSONRequest(serverBase + "VectorLayer/" + (layerProperties.get('Name') ? "Update.ashx" : "Insert.ashx") + "?WrapStyle=func" + 
                    "&Title=" + encodeURIComponent(layerProperties.get('Title')) + 
                    "&Copyright=" + encodeURIComponent(layerProperties.get('Copyright')) + 
                    "&Description=" + encodeURIComponent(layerProperties.get('Description')) + 
                            geometryDataSource + 
                            "&MapName=" + encodeURIComponent(mapProperties.name) + 
                            cols + updateParams + encoding + temporalParams + metadataString + tableCSParam + RCParams + nameObjectParams, 
                            function(response)
                            {
                                if (!parseResponse(response))
                                    return;
                            
                                
                        var task = nsGmx.asyncTaskManager.addTask(response.Result, layerProperties.get('Name') || null);
                                
                                
                        if (layerProperties.get('Name'))
                                {
                                    _queryMapLayers.asyncUpdateLayer(task, properties, true);
                                }
                                else 
                                {
                                    if (_params.addToMap)
                                        _queryMapLayers.asyncCreateLayer(task, layerTitle);
                                }
                                
                                _params.doneCallback && _params.doneCallback(task, layerTitle);
                            }
                        )
                    }
        } else {
            var name = layerProperties.get('Name');
            var params = {
                    WrapStyle: "window",
                    Title: layerProperties.get('Title'),
                    Copyright: layerProperties.get('Copyright'),
                    Legend: layerProperties.get('Legend'),
                    Description: layerProperties.get('Description'),
                    TilePath: layerProperties.get('TilePath').Path,
                    BorderFile: typeof _mapHelper.drawingBorders.get(name) == 'undefined' ? (layerProperties.get('ShapePath').Path || '') : '',
                    BorderGeometry: typeof _mapHelper.drawingBorders.get(name) == 'undefined' ? '' : JSON.stringify(merc_geometry(_mapHelper.drawingBorders.get(name).geometry)),
                    MapName: mapProperties.name,
                    MetaProperties: JSON.stringify(metaProperties)
                },
                needRetiling = false,
                layerTitle = layerProperties.get('Title');
            
            if (name)
            {
                params["RasterLayerID"] = layerProperties.get('LayerID');
                
                // var oldShapePath = properties.ShapePath.Path,
                    // oldTilePath = properties.TilePath.Path,
                var oldDrawing = origLayerProperties.get('Geometry');
                
                // если изменились поля с геометрией, то нужно тайлить заново и перегрузить слой в карте
                if (layerProperties.get('ShapePath').Path != origLayerProperties.get('ShapePath').Path ||
                    layerProperties.get('TilePath').Path != origLayerProperties.get('TilePath').Path ||
                    oldDrawing && typeof _mapHelper.drawingBorders.get(name) != 'undefined' 
                        && JSON.stringify(_mapHelper.drawingBorders.get(name).getGeometry()) != JSON.stringify(from_merc_geometry(oldDrawing)) ||
                    !oldDrawing && typeof _mapHelper.drawingBorders.get(name) != 'undefined' ||
                    oldDrawing && typeof _mapHelper.drawingBorders.get(name) == 'undefined') {
                    
                    needRetiling = true;
                }
            }
            
            params["GeometryChanged"] = needRetiling;
            
            sendCrossDomainPostRequest(serverBase + "RasterLayer/" + (name ? "Update.ashx" : "Insert.ashx"), params, function(response)
                {
                    if (!parseResponse(response))
                        return;
                
                    var task = nsGmx.asyncTaskManager.addTask(response.Result, name || null);
                    
                    if (name)
                    {
                        _queryMapLayers.asyncUpdateLayer(task, properties, needRetiling);
                    }
                else
                {
                        if (_params.addToMap)
                            _queryMapLayers.asyncCreateLayer(task, layerTitle);
                    }
                    
                    _params.doneCallback && _params.doneCallback(task, layerTitle);
                })
        }
    }
}

var createLayerEditorProperties = function(div, type, parent, properties, treeView, params)
{
    var layerEditor = new nsGmx.LayerEditor(div, type, properties, treeView, params);
    
    var id = 'layertabs' + (div ? div.gmxProperties.content.properties.name : '');
    
    var tabs = layerEditor.getTabs().concat(params.moreTabs || []);
    
    var lis = [], containers = [];
    for (var t = 0; t < tabs.length; t++) {
        lis.push(_li([_a([_t(tabs[t].title)],[['attr','href','#' + tabs[t].name + id]])]));
        containers.push(tabs[t].container);
        $(tabs[t].container).attr('id', tabs[t].name + id);
    }
    
    var tabMenu = _div([_ul(lis)].concat(containers));
    
    var saveMenuCanvas = _div([layerEditor.getSaveButton()]);
    
    $(parent).empty().append(tabMenu, saveMenuCanvas);
    
    $(tabMenu).tabs({selected: params.selected || 0});
    
    return;
    
    //--------------------------
    //--------------------------
    //--------------------------
                    
    nsGmx.TagMetaInfo.loadFromServer(function(tagsInfo)
    {
        var advancedCollapsable;
        
        shownProperties.push({tr:_tr([_td([collapsableTagsParent], [['attr', 'colSpan', 2]])])});
            
        var trs = _mapHelper.createPropertiesTable(shownProperties, properties, {leftWidth: 70});
        _(parent, [_div([_table([_tbody(trs)],[['dir','className','propertiesTable']])])]);
        
        if (advancedCollapsable)
        {
            advancedCollapsable.addManagedElements($('.layer-advanved-options', parent));
        }
        
        // в IE инициализировать чекбоксы можно только после их добавления в DOM-дерево
        $('input#chxFileSource', sourceCheckbox).attr('checked', 'checked');
        
        // смотрим, а не выполняются ли для этого слоя задачи
        var haveTask = false;
        if (div)
        {
            for (var id in _mapHelper.asyncTasks)
                if (_mapHelper.asyncTasks[id] == divProperties.name)
                {
                    haveTask = true;
                    
                    break;		
                }
        }
        
        if (!haveTask)
        {
            var saveButton = makeLinkButton(div ? _gtxt("Изменить") : _gtxt("Создать"));
            
            saveButton.style.marginLeft = '10px';
            
            saveButton.onclick = function()
            {
                var mapProperties = _layersTree.treeModel.getMapProperties();
                var isCustomAttributes = type === "Vector" && selectedSource === 2;
                var errorFlag = false,
                    checkFields = (type == "Vector" ? ['title', 'date'] : ['title', 'date']);
                    
                if (!isCustomAttributes)
                if (type !== "Vector")
                    checkFields.push('TilePath.Path');
                else if (selectedSource == 0)
                    checkFields.push('ShapePath.Path');
                else if (selectedSource == 1)
                    checkFields.push('TableName');
                    
                for (var i = 0; i < checkFields.length; i++)
                {
                    var inputField = $(parent).find("[fieldName='" + checkFields[i] + "']");
                    
                    if (inputField.length && inputField[0].value == '')
                    {
                        errorFlag = true;
                        inputError(inputField[0], 2000);
                    }
                }
                
                if (errorFlag)
                    return;
                
                if (type == "Vector")
                {
                    
                }
                else
                {
                    var params = {
                            WrapStyle: "window",
                            Title: title.value,
                            Copyright: copyright.value,
                            Legend: legend.value,
                            Description: descr.value,
                            TilePath: $(parent).find("[fieldName='TilePath.Path']")[0].value,
                            BorderFile: typeof _mapHelper.drawingBorders.get(properties.Name) == 'undefined' ? $(parent).find("[fieldName='ShapePath.Path']")[0].value : '',
                            BorderGeometry: typeof _mapHelper.drawingBorders.get(properties.Name) == 'undefined' ? '' : JSON.stringify(merc_geometry(_mapHelper.drawingBorders.get(properties.Name).geometry)),
                            MapName: mapProperties.name,
                            MetaProperties: JSON.stringify(metaProperties)
                        },
                        needRetiling = false,
                        layerTitle = title.value;
                    
                    if (div)
                    {
                        params["RasterLayerID"] = divProperties.LayerID;
                        
                        var oldShapePath = properties.ShapePath.Path,
                            oldTilePath = properties.TilePath.Path,
                            oldDrawing = properties.ShapePath.Geometry;
                        
                        // если изменились поля с геометрией, то нужно тайлить заново и перегрузить слой в карте
                        if ($(parent).find("[fieldName='ShapePath.Path']")[0].value != oldShapePath ||
                            $(parent).find("[fieldName='TilePath.Path']")[0].value != oldTilePath ||
                            oldDrawing && typeof _mapHelper.drawingBorders.get(properties.Name) != 'undefined' && JSON.stringify(_mapHelper.drawingBorders.get(properties.Name)) != JSON.stringify(oldDrawing) ||
                            !oldDrawing && typeof _mapHelper.drawingBorders.get(properties.Name) != 'undefined' ||
                            oldDrawing && typeof _mapHelper.drawingBorders.get(properties.Name) == 'undefined')
                            needRetiling = true;
                    }
                    
                    params["GeometryChanged"] = needRetiling;
                    
                    sendCrossDomainPostRequest(serverBase + "RasterLayer/" + (!div ? "Insert.ashx" : "Update.ashx"), params, function(response)
                        {
                            if (!parseResponse(response))
                                return;
                        
                            var task = nsGmx.asyncTaskManager.addTask(response.Result, div ? divProperties.name : null);
                            
                            if (div)
                            {
                                _queryMapLayers.asyncUpdateLayer(task, properties, needRetiling);
                            }
                            else
                            {
                                if (_params.addToMap)
                                    _queryMapLayers.asyncCreateLayer(task, layerTitle);
                            }
                            
                            _params.doneCallback && _params.doneCallback(task, layerTitle);
                        })
                }
            }
            
            _(parent, [_div([saveButton], [['css','paddingTop','10px']])])
        }
        
        if (!div)
            title.focus();
    })
}

nsGmx.LayerEditor = LayerEditor;

gmxCore.addModule('LayerEditor', {
    createLayerEditorProperties: createLayerEditorProperties,
    LayerEditor: LayerEditor
})
    
}(jQuery)