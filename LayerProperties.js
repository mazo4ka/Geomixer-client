﻿!function($){

/** Объект, описывающий один атрибут слоя
 * @typedef {Object} nsGmx.LayerProperties.Column
 * @property {String} name Имя атрибута
 * @property {String} oldName Исходное имя атрибута. Используется для переименования атрибутов. Для новых атрибутов это поле должно отсутствовать.
 * @property {{user: String, server: String}} type Тип атрибута. Поля соответствуют серверной и клиентской форме записи типа. Клиентская может отсутствовать
 * @property {Boolean} IsPrimary
 * @property {Boolean} IsIdentity
 * @property {Boolean} IsComputed
*/

var LatLngColumnsModel = Backbone.Model.extend({
    defaults: {
        XCol: null,
        YCol: null
    }
});

/** Расширенный набор свойства слоя. Используется для редактирования свойств. Умеет сохранять себя на сервере
 * @class
 * @memberOf nsGmx
 * @extends Backbone.Model
 * @property {String} Type Тип слоя. Vector/Raster
 * @property {Number} LayerID Серверный ID слоя
 * @property {String} Name Уникальный неитерируемый ID слоя
 * @property {String} Title Заголовок слоя
 * @property {String} Copyright Копирайт слоя
 * @property {String} Description Описание слоя
 * @property {Object} MetaProperties Метаданные слоя
 * @property {Object} ShapePath Имеет атрибут Path. Для векторных слоёв из файла - источник слоя. Для растровых - файл с границей растра
 * @property {Object} Geometry Граница растрового слоя
 
 * @property {String} Legend Легенда слоя. Только для растровых слоёв
 
 * @property {String} NameObject Шаблон названий объектов. Только для векторных слоёв
 * @property {String} GeometryType Тип геометрии слоя. Только для векторных слоёв
 * @property {String} Quicklook Шаблон URL для квиклуков. Только для векторных слоёв
 * @property {Object} TilePath Имеет атрибут Path. Путь к файлу с тайлами. Только для векторных слоёв
 * @property {String} EncodeSource Кодировка источника данных слоя. Только для векторных слоёв
 * @property {nsGmx.LayerProperties.Column[]} Columns Описание типов и названий атрибутов слоя. Только для векторных слоёв
 * @property {String} TableName Название таблицы, если источник был таблицей. Только для векторных слоёв
 * @property {String} TableCS Система координат выбранной таблицы ("EPSG:4326"/"EPSG:3395"). Только для векторных слоёв
 * @property {String} SourceType Тип источника данных для слоя (file/table/manual)
 * @property {String[]} Attributes Список имён атрибутов векторного слоя (не сохраняется)
 * @property {String[]} AttrTypes Список типов атрибутов векторного слоя (не сохраняется)
 * @property {nsGmx.LayerRCProperties} RC Параметры каталога растров. Только для векторных слоёв
 * @property {nsGmx.TemporalLayerParams} Temporal Параметры мультивременного слоя. Только для векторных слоёв
 * @property {LatLngColumnsModel} GeometryColumnsLatLng Описание выбранных в таблице колонок с геометрией
*/
var LayerProperties = Backbone.Model.extend(
    /** @lends nsGmx.LayerProperties.prototype */
{
    initialize: function(attrs) {
        this.attributes = nsGmx._.clone(attrs || {});
    },
    
    initFromViewer: function(type, divProperties, layerProperties) {
            
        this.set({
            Type:           type,
            Title:          divProperties ? (divProperties.title || '') : (layerProperties.Title || ''),
            Copyright:      divProperties ? (divProperties.Copyright || '') : (layerProperties.Copyright || ''),
            Legend:         divProperties ? (divProperties.Legend || '') : (layerProperties.Legend || ''),
            Description:    divProperties ? (divProperties.description || '') : (layerProperties.Description || ''),
            NameObject:     divProperties ? (divProperties.NameObject || '') : (layerProperties.NameObject || ''),
            //AllowSearch:    divProperties ? (divProperties.AllowSearch || false) : (layerProperties.AllowSearch || false),
            GeometryType:   divProperties ? divProperties.GeometryType : layerProperties.GeometryType,
            LayerID:        divProperties ? divProperties.LayerID : layerProperties.LayerID,
            Quicklook:      divProperties ? divProperties.Quicklook : layerProperties.Quicklook,
            MetaProperties: layerProperties.MetaProperties || {},
            ShapePath:      layerProperties.ShapePath || {},
            TilePath:       layerProperties.TilePath || {},
            Name:           layerProperties.name,
            EncodeSource:   layerProperties.EncodeSource,
            Columns:        layerProperties.Columns,
            TableName:      layerProperties.TableName,
            TableCS:        layerProperties.TableCS,
            SourceType:     layerProperties.SourceType || 'file',
            Geometry:       layerProperties.Geometry,
            
            Attributes:     divProperties ? divProperties.attributes : [],
            AttrTypes:      divProperties ? divProperties.attrTypes : [],
            
            
            MetaPropertiesEditing: null
        })
        
        this.set('RC', new nsGmx.LayerRCProperties({
            IsRasterCatalog:      layerProperties.IsRasterCatalog,
            RCMinZoomForRasters:  layerProperties.RCMinZoomForRasters,
            RCMaskForRasterTitle: layerProperties.RCMaskForRasterTitle,
            RCMaskForRasterPath:  layerProperties.RCMaskForRasterPath,
            ColumnTagLinks:       layerProperties.ColumnTagLinks
        }));
        
        divProperties = divProperties || {};
        
        var tempPeriods = divProperties.TemporalPeriods;
        this.set('Temporal', new nsGmx.TemporalLayerParams({
            isTemporal: !!divProperties.Temporal,
            minPeriod: tempPeriods && tempPeriods[0],
            maxPeriod: tempPeriods && tempPeriods[tempPeriods.length-1],
            maxShownPeriod: divProperties.maxShownPeriod || 0,
            columnName: divProperties.TemporalColumnName
        }));        
        
        this.set('GeometryColumnsLatLng', new LatLngColumnsModel({
            XCol: layerProperties.GeometryXCol,
            YCol: layerProperties.GeometryYCol
        }));

        if (layerProperties.Name) {
            this.set("Name", layerProperties.Name);
        }
    },
    
    /** Инициализирует класс, используя информацию о слое с сервера.
     * @param {String} layerName ID слоя, информацию о котором нужно получить
     * @return {jQuery.Deferred} Deferred, который будет заполнен после инициализации класса
     */
    initFromServer: function(layerName) {
        var def = $.Deferred(),
            _this = this;
        
        sendCrossDomainPostRequest(serverBase + "Layer/GetLayerInfo.ashx?WrapStyle=func&NeedAttrValues=false&LayerName=" + layerName, function(response) {
            if (!parseResponse(response)) {
                def.reject(response);
                return;
            }
            
            _this.initFromViewer('Vector', null, response.Result);
            
            ref.resolve();
        });
        
        return def.promise();
    },
    
    /** Сохраняет изменения в слое или создаёт новый слой на сервере
     * @param {Boolean} geometryChanged Нужно ли передавать на сервер геометрию растрового слоя
     * @param {Function} [callback] Будет вызван после получения ответа от сервера
     * @return {jQuery.Deferred} Deferred, который будет заполнен после сохранения всей информации на сервере
     */
    save: function(geometryChanged, callback) {
        var attrs = this.attributes,
            name = attrs.Name,
            stype = attrs.SourceType,
            def = $.Deferred();
        
        var reqParams = {
            WrapStyle: "window",
            Title: attrs.Title,
            Description: attrs.Description,
            Copyright: attrs.Copyright
        };
        
        var metaProperties = {};
        var layerTags = attrs.MetaPropertiesEditing;
        if (layerTags) {
            layerTags.eachValid(function(id, tag, value)
            {
                var type = layerTags.getTagMetaInfo().getTagType(tag);
                var value = nsGmx.Utils.convertToServer(type, value);
                if (value !== null)
                    metaProperties[tag] = {Value: value, Type: type};
            })
        }
            
        reqParams.MetaProperties = JSON.stringify(metaProperties);
                
        if (attrs.Type === 'Vector') {
            if (attrs.EncodeSource) reqParams.EncodeSource = attrs.EncodeSource;
            reqParams.NameObject = attrs.NameObject || null;
            if (stype === 'table') reqParams.TableCS = attrs.TableCS;

            var rcProps = attrs.RC;
            reqParams.IsRasterCatalog = !!(rcProps && rcProps.get('IsRasterCatalog'));
            if (reqParams.IsRasterCatalog)
            {
                reqParams.RCMinZoomForRasters = rcProps.get('RCMinZoomForRasters');
                reqParams.RCMaskForRasterPath = rcProps.get('RCMaskForRasterPath');
                reqParams.RCMaskForRasterTitle = rcProps.get('RCMaskForRasterTitle');
                reqParams.ColumnTagLinks = JSON.stringify(rcProps.get('ColumnTagLinks'));
            }
            
            var tempProperties = attrs.Temporal;
            
            reqParams.TemporalLayer = !!(tempProperties && tempProperties.get('isTemporal') && tempProperties.get('columnName'));
            
            if ( reqParams.TemporalLayer ) {
                reqParams.TemporalColumnName = tempProperties.get('columnName');
                reqParams.TemporalPeriods = tempProperties.getPeriodString();
                reqParams.maxShownPeriod = tempProperties.get('maxShownPeriod');
            }

            
            var parsedColumns = nsGmx.LayerProperties.parseColumns(attrs.Columns);
            
            //отсылать на сервер колонки нужно только если это уже созданный слой или тип слоя "Вручную"
            if (attrs.Columns && (name || stype === 'manual')) {
                reqParams.Columns = JSON.stringify(attrs.Columns);
            }
            
            if (attrs.LayerID) reqParams.VectorLayerID = attrs.LayerID;
            reqParams.Quicklook = attrs.Quicklook || null;
            
            if (!name && stype === 'manual')
            {
                reqParams.UserBorder = attrs.UserBorder ? JSON.stringify(attrs.UserBorder) : null;
                reqParams.geometrytype = attrs.GeometryType;
                        
                sendCrossDomainPostRequest(serverBase + "VectorLayer/CreateVectorLayer.ashx", reqParams,
                    function(response)
                    {
                        if (!parseResponse(response)) {
                            def.reject(response);
                            return;
                        }
                    
                        callback && callback(response);
                        def.resolve(response);
                    }
                )
            }
            else
            {
                //Если нет колонки с геометрией, то нужно передавать выбранные пользователем колонки
                var geomColumns = attrs.GeometryColumnsLatLng;
                if (parsedColumns.geomCount === 0 && geomColumns && geomColumns.get('XCol') && geomColumns.get('YCol')) {
                    reqParams.ColX = geomColumns.get('XCol');
                    reqParams.ColY = geomColumns.get('YCol');
                }
            
                if (stype !== 'manual') {
                    reqParams.GeometryDataSource = stype === 'file' ? attrs.ShapePath.Path : attrs.TableName;
                }
                        
                sendCrossDomainPostRequest(serverBase + "VectorLayer/" + (name ? "Update.ashx" : "Insert.ashx"), reqParams,
                    function(response)
                    {
                        if (!parseResponse(response)) {
                            def.reject(response);
                            return;
                        }
                    
                        callback && callback(response);
                        def.resolve(response);
                    }
                )
            }
        } else {
            var curBorder = _mapHelper.drawingBorders.get(name);
            
            reqParams.Legend = attrs.Legend;
            if (attrs.TilePath.Path) reqParams.TilePath = attrs.TilePath.Path;
            reqParams.GeometryChanged = geometryChanged;
            
            if (typeof curBorder === 'undefined') {
                reqParams.BorderFile = attrs.ShapePath.Path || '';
            } else {
                reqParams.BorderGeometry = JSON.stringify(merc_geometry(curBorder.geometry));
            }
            
            if (attrs.LayerID) reqParams.RasterLayerID = attrs.LayerID;
            
            sendCrossDomainPostRequest(serverBase + "RasterLayer/" + (name ? "Update.ashx" : "Insert.ashx"), reqParams, function(response)
                {
                    if (!parseResponse(response)) {
                        def.reject(response);
                        return;
                    }
                
                    callback && callback(response);
                    def.resolve(response);
                }
            )
        }
        
        return def.promise();
    }
})

LayerProperties.parseColumns = function(columns) {
    var geomCount = 0; //кол-во колонок с типом Геометрия
    var coordColumns = []; //колонки, которые могут быть использованы для выбора координат
    var dateColumns = []; //колонки, которые могут быть использованы для выбора временнОго параметра
        
    columns = columns || [];
        
    for (var f = 0; f < columns.length; f++)
    {
        var type = columns[f].ColumnSimpleType.toLowerCase();
        if ( type === 'geometry')
            geomCount++;
            
        if ((type === 'string' || type === 'integer' || type === 'float') && !columns[f].IsIdentity && !columns[f].IsPrimary)
            coordColumns.push(columns[f].Name);
            
        if (type === 'date' || type === 'datetime')
            dateColumns.push(columns[f].Name);
    }
    
    return { geomCount: geomCount, coordColumns: coordColumns, dateColumns: dateColumns };
}

nsGmx.LayerProperties = LayerProperties;
gmxCore.addModule('LayerProperties', {
    LayerProperties: LayerProperties,
    LatLngColumnsModel: LatLngColumnsModel
})

}(jQuery);