﻿var globalFlashMap;

//Тут кратко описываются разные внешние классы для системы генерации документации

/** ГеоМиксер активно использует {@link http://jquery.com/|jQuery}
 * @namespace jQuery
 */

/** Официальная документация: {@link http://api.jquery.com/category/deferred-object/|jQuery Deferred}
 * @name Deferred
 * @memberOf jQuery
 */
 
 
/** Библиотека для формализации понятия модели и представления: {@link http://backbonejs.org/|Backbone}
 * @namespace Backbone
 */

/** Официальная документация: {@link http://backbonejs.org/#Model| Backbone Model}
 * @name Model
 * @memberOf Backbone
 */
 
 
/**
    Основное пространство имён ГеоМиксера
    @namespace
*/
var nsGmx = nsGmx || {};
nsGmx.widgets = nsGmx.widgets || {};

(function(){

var gmxJSHost = window.gmxJSHost || "";

//скопирована из API, так как используется до его загрузки
function parseUri(str) 
{
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	uri.hostOnly = uri.host;
	uri.host = uri.authority; // HACK

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

if (!window.mapHostName && window.gmxJSHost)
    window.mapHostName = /http:\/\/(.*)\/api\//.exec(window.gmxJSHost)[1];
    
var _mapHostName; //откуда грузить API

if (window.mapHostName)
{
    _mapHostName = "http://" + window.mapHostName + "/api/";
}
else
{
     var curUri = parseUri(window.location.href);
     _mapHostName = "http://" + curUri.host + curUri.directory;
}


var _serverBase = window.serverBase || /(.*)\/[^\/]*\//.exec(_mapHostName)[1] + '/';

//подставляет к локальному имени файла хост (window.gmxJSHost) и, опционально, рандомное поле для сброса кэша (window.gmxDropBrowserCache)
var _getFileName = function( localName )
{
	return gmxJSHost + localName + ( window.gmxDropBrowserCache ? "?" + Math.random() : "");
}
	
nsGmx.initGeoMixer = function()
{

nsGmx.mapLayersList = {
    load:   gmxCore.createDeferredFunction('mapLayersList', 'load'),
    unload: gmxCore.createDeferredFunction('mapLayersList', 'unload')
}

var oSearchLeftMenu = new leftMenu();

// используется для сохранения специфичных параметров в пермалинке
window.collectCustomParams = function()
{
	return null;
}

//для синхронизации меню и тулбара при включении/выключении сетки координат
var gridManager = {
    state: false,
    setState: function(newState) {
        if (this.state == newState) {
            return;
        }
        
        this.state = newState;
        gmxAPI._leaflet.LMap.gmxControlIconManager.get('gridTool').setActive(newState);
        _menuUp.checkItem('mapGrid', newState);
        _mapHelper.gridView = newState; //можно удалить?
        globalFlashMap.grid.setVisible(newState);
    }
}

var createMenuNew = function()
{
    //формирует описание элемента меню для включения/выключения плагина
    var getPluginToMenuBinding = function(pluginName, menuItemName, menuTitle) {
        var plugin = nsGmx.pluginsManager.getPluginByName(pluginName);
        var sel = function() {
            nsGmx.pluginsManager.setUsePlugin(pluginName, true);
            nsGmx.pluginsManager.done(function() {
                plugin.body.afterViewer && plugin.body.afterViewer(plugin.params, globalFlashMap);
                _mapHelper.mapPlugins.addPlugin(pluginName, plugin.params);
            })
        }
        
        var unsel = function() {
            nsGmx.pluginsManager.setUsePlugin(pluginName, false);
            nsGmx.pluginsManager.done(function() {
                _mapHelper.mapPlugins.remove(pluginName);
                plugin.body.unload && plugin.body.unload();
            })
        }
        
        return {
            id: menuItemName,
            title: menuTitle, 
            onsel: sel,
            onunsel: unsel,
            checked: plugin.isUsed()
        }
    }
    
    var isMapEditor = _queryMapLayers.currentMapRights() === "edit";
    
	_menuUp.submenus = [];
	
	_menuUp.addItem(
	{id:"mapsMenu", title:_gtxt("Карта"),childs:
		[
			{id: 'mapList',      title: _gtxt('Открыть'),           func: function(){_queryMapLayers.getMaps()}},
			{id: 'mapCreate',    title: _gtxt('Создать'),           func: function(){_queryMapLayers.createMapDialog(_gtxt("Создать карту"), _gtxt("Создать"), _queryMapLayers.createMap)}},
			{id: 'mapSave',      title: _gtxt('Сохранить'),         func: _queryMapLayers.saveMap},
			{id: 'mapSaveAs',    title: _gtxt('Сохранить как'),     func: function(){_queryMapLayers.createMapDialog(_gtxt("Сохранить карту как"), _gtxt("Сохранить"), _queryMapLayers.saveMapAs)},   delimiter: true},
			{id: 'share',        title: _gtxt('Поделиться'),        func: function(){_mapHelper.showPermalink()}},
			{id: 'codeMap',      title: _gtxt('Код для вставки'),   func: function(){_mapHelper.createAPIMapDialog()}},
			{id: 'mapTabsNew',   title: _gtxt('Добавить закладку'), func: function(){mapHelp.tabs.load('mapTabs');_queryTabs.add();}},
			{id: 'printMap',     title: _gtxt('Печать'),            func: function(){_mapHelper.print()}, delimiter: true},
			{id: 'mapProperties',title: _gtxt('Свойства'),          func: function(){
                var div = $(_layersTree._treeCanvas).find('div[MapID]')[0];
                nsGmx.createMapEditor(div);
            }, disabled: !isMapEditor},
			{id: 'mapSecurity',  title: _gtxt('Права доступа'),     func: function(){
                var securityDialog = new nsGmx.mapSecurity(),
                    props = _layersTree.treeModel.getMapProperties();
                securityDialog.getRights(props.MapID, props.title);
            }, disabled: !isMapEditor}
		]});
	
	_menuUp.addItem(
	{id:"dataMenu", title: _gtxt('Данные'), childs:
		[
			{id:'layerList',   title: _gtxt('Открыть слой'),    func:function(){_queryMapLayers.getLayers()}, disabled: !isMapEditor},
			{id:'createLayer', title: _gtxt('Создать слой'),    childs:
				[
					{id:'createRasterLayer', title: _gtxt('Растровый'), func: _mapHelper.createNewLayer.bind(_mapHelper, 'Raster'), disabled: !isMapEditor},
					{id:'createVectorLayer', title: _gtxt('Векторный'), func: _mapHelper.createNewLayer.bind(_mapHelper, 'Vector'), disabled: !isMapEditor},
					{id:'createMultiLayer',  title: _gtxt('Мультислой'), func: _mapHelper.createNewLayer.bind(_mapHelper, 'Multi'), disabled: !isMapEditor}
				],
                disabled: !isMapEditor},
			{id:'createGroup', title: _gtxt('Создать каталог'), func:function(){
                var div = $(_layersTree._treeCanvas).find('div[MapID]')[0];
                nsGmx.addSubGroup(div, _layersTree);
            }, disabled: !isMapEditor},
			{id:'baseLayers',  title: _gtxt('Базовые слои'),    func:function(){
                var div = $(_layersTree._treeCanvas).find('div[MapID]')[0];
                nsGmx.createMapEditor(div, 1);
            }, delimiter: true, disabled: !isMapEditor},
			{id:'loadFile',    title: _gtxt('Загрузить файл'),  func:drawingObjects.loadShp.load},
			{id:'wms',         title: _gtxt('Подключить WMS'),  func:loadServerData.WMS.load},
			{id:'wfs',         title: _gtxt('Подключить WFS'),  func:loadServerData.WFS.load}
			
		]});
	
	_menuUp.addItem(
	{id:"viewMenu", title: _gtxt("Вид"),childs:
		[
			{id:'extMaps',        title: _gtxt('Дополнительные карты'), func: mapHelp.externalMaps.load},
			{id:'mapTabs',        title: _gtxt('Закладки'),             func: mapHelp.tabs.load},
			{id:'DrawingObjects', title: _gtxt('Объекты'),              func: oDrawingObjectGeomixer.Load},
			{id:'searchView',     title: _gtxt('Результаты поиска'),    func: oSearchControl.Load}
		]});
	
	_menuUp.addItem(
        {id:"instrumentsMenu", title:_gtxt("Инструменты"),childs:
		[
			{id: 'mapGrid', title:_gtxt('Координатная сетка'), 
                onsel: gridManager.setState.bind(gridManager, true), //function(){globalFlashMap.grid.setVisible(true); _mapHelper.gridView = true;}, 
                onunsel: gridManager.setState.bind(gridManager, false), //function(){globalFlashMap.grid.setVisible(false); _mapHelper.gridView = false;},
                checked: _mapHelper.gridView
            },
			{id: 'shift',         title: _gtxt('Ручная привязка растров'), func:function(){}, disabled: true},
			{id: 'search',        title: _gtxt('Поиск слоев на карте'), func:nsGmx.mapLayersList.load},
			{id: 'crowdsourcing', title: _gtxt('Краудсорсинг данных'), func:function(){}, disabled: true},
			{id: 'geocoding',     title: _gtxt('Пакетный геокодинг'), func:function(){}, disabled: true},
			{id: 'directions',    title: _gtxt('Маршруты'), func:function(){}, disabled: true}
		]});
        
    	_menuUp.addItem(
        {id: "pluginsMenu", title: _gtxt('Сервисы'), childs:
		[
            getPluginToMenuBinding('Cadastre', 'cadastre', _gtxt('Кадастр Росреестра')),
            getPluginToMenuBinding('Wikimapia', 'wikimapia', _gtxt('Викимапиа')),
            getPluginToMenuBinding('ScanEx catalog', 'scanexSearch', _gtxt('Каталог СКАНЭКС')),
            getPluginToMenuBinding('Fire Plugin', 'fires', _gtxt('Космоснимки-пожары')),
            getPluginToMenuBinding('GIBS Plugin', 'gibs', _gtxt('GIBS NASA'))
		]});
        
	_menuUp.addItem(
	{id:"helpMenu", title:_gtxt("Справка"), childs:
		[
			{id:'about',        title:_gtxt('О проекте'),                 func: _mapHelper.version},
			{id:'usage',        title: _gtxt('Руководство пользователя'), func: function(){
                window.open('http://geomixer.ru/docs/manual/', '_blank');
            }},
			{id:'api',          title: _gtxt('GeoMixer API'),             func: function(){
                window.open('http://geomixer.ru/docs/api_reference/', '_blank');
            }},
			{id:'pluginsUsage', title: _gtxt('Использование плагинов'),   func: function(){
                window.open('http://geomixer.ru/docs/plugins/', '_blank');
            }}
		]
    });
}

var createMenu = function()
{
	_menuUp.submenus = [];
	_menuUp.addItem(
	{id:"mapsMenu", title:_gtxt("Карта"),childs:
		[
			{id: 'mapCreate',    title: _gtxt('Создать'),           func: function(){_queryMapLayers.createMapDialog(_gtxt("Создать карту"), _gtxt("Создать"), _queryMapLayers.createMap)}},
			{id: 'mapList',      title: _gtxt('Открыть'),           func: function(){_queryMapLayers.getMaps()}, delimiter: true},
			{id: 'mapSave',      title: _gtxt('Сохранить'),         func: _queryMapLayers.saveMap},
			{id: 'mapSaveAs',    title: _gtxt('Сохранить как'),     func: function(){_queryMapLayers.createMapDialog(_gtxt("Сохранить карту как"), _gtxt("Сохранить"), _queryMapLayers.saveMapAs)}},
			{id: 'permalink',    title: _gtxt('Ссылка на карту'),   func: function(){_mapHelper.showPermalink()}, delimiter: true},
			{id: 'mapTabsNew',   title: _gtxt('Добавить закладку'), func: function(){mapHelp.tabs.load('mapTabs');_queryTabs.add();}},
			{id: 'codeMap',      title: _gtxt('Код для вставки'),   func: function(){_mapHelper.createAPIMapDialog()}},
            {id: 'stileLibrary', title: 'Библиотека стилей',        func: nsGmx.showStyleLibraryDialog},
			{id: 'printMap',     title: _gtxt('Печать'),            func: function(){_mapHelper.print()}}
		]});
	
	_menuUp.addItem(
	{id:"layersMenu", title:_gtxt("Слой"),childs:
		[
			{id:'layerList', title:_gtxt('Открыть'),func:function(){_queryMapLayers.getLayers()}},
			{id:'layersVector', title:_gtxt('Создать векторный слой'),func:function(){_mapHelper.createNewLayer("Vector")}},
			{id:'layersRaster', title:_gtxt('Создать растровый слой'),func:function(){_mapHelper.createNewLayer("Raster")}},
			{id:'layersMultiRaster', title:_gtxt('Создать мультислой'),func:function(){_mapHelper.createNewLayer("Multi")}}
		]});
	
	_menuUp.addItem(
	{id:"viewMenu", title:_gtxt("Вид"),childs:
		[
			{id:'layers', title:_gtxt('Дерево слоев'),onsel:mapLayers.mapLayers.load,onunsel:mapLayers.mapLayers.unload},
			{id:'externalMaps', title:_gtxt('Дополнительные карты'),onsel:mapHelp.externalMaps.load,onunsel:mapHelp.externalMaps.unload},
			{id:'DrawingObjects', title:_gtxt('Объекты на карте'),onsel: oDrawingObjectGeomixer.Load, onunsel: oDrawingObjectGeomixer.Unload},
			{id:'search', title:_gtxt('Результаты поиска'), onsel: oSearchControl.Load,onunsel:oSearchControl.Unload},
			{id:'mapTabs', title:_gtxt('Закладки'),onsel:mapHelp.tabs.load,onunsel:mapHelp.tabs.unload}
		]});
	
	_menuUp.addItem(
        {id:"instrumentsMenu", title:_gtxt("Инструменты"),childs:
		[
			{id: 'layersList', title:_gtxt('Поиск слоев'), onsel: nsGmx.mapLayersList.load, onunsel: nsGmx.mapLayersList.unload},
			{id: 'mapGrid', title:_gtxt('Координатная сетка'), func:function(){_mapHelper.gridView = !_mapHelper.gridView; globalFlashMap.grid.setVisible(_mapHelper.gridView);}}
		]});
	
	
	
	var services = [
			{id:'shp', title:_gtxt('Загрузить файл'),onsel:drawingObjects.loadShp.load,onunsel:drawingObjects.loadShp.unload},
			{id:'kml', title:_gtxt('Загрузить KML'),onsel:KML.KML.load,onunsel:KML.KML.unload},
			{id:'loadServerData', title:_gtxt('Загрузить данные'), childs:
				[
					{id:'wfs', title:_gtxt('WFS сервер'),onsel:loadServerData.WFS.load,onunsel:loadServerData.WFS.unload},
					{id:'wms', title:_gtxt('WMS сервер'),onsel:loadServerData.WMS.load,onunsel:loadServerData.WMS.unload}
				]}
		];
	
	_menuUp.addItem(
	{id:"servicesMenu", title:_gtxt("Сервисы"),childs:services});
	
	_menuUp.addItem(
	{id:"helpMenu", title:_gtxt("Справка"),childs:
		[
			{id:'usage', title:_gtxt('Использование'),onsel:mapHelp.mapHelp.load,onunsel:mapHelp.mapHelp.unload},
			{id:'serviceHelp', title:_gtxt('Сервисы'),onsel:mapHelp.serviceHelp.load,onunsel:mapHelp.serviceHelp.unload},
			{id:'about', title:_gtxt('О проекте'),func:_mapHelper.version}
		]});
}

var createDefaultMenu = function()
{
	_menuUp.submenus = [];
	
	_menuUp.addItem(
	{id:"mapsMenu", title:_gtxt("Карта"),childs:
		[
			{id:'mapCreate', title:_gtxt('Создать'),func:function(){_queryMapLayers.createMapDialog(_gtxt("Создать карту"), _gtxt("Создать"), _queryMapLayers.createMap)}},
			{id:'mapList', title:_gtxt('Открыть'),func:function(){_queryMapLayers.getMaps()}}
		]});
	
	_menuUp.addItem(
	{id:"helpMenu", title:_gtxt("Справка"),childs:
		[
			{id:'usage', title:_gtxt('Использование'),onsel:mapHelp.mapHelp.load,onunsel:mapHelp.mapHelp.unload},
			{id:'serviceHelp', title:_gtxt('Сервисы'),onsel:mapHelp.serviceHelp.load,onunsel:mapHelp.serviceHelp.unload},
			{id:'about', title:_gtxt('О проекте'),func:_mapHelper.version}
		]});
}

function createHeader()
{
	var logoDivClass = (typeof window.gmxViewerUI != 'undefined' &&  window.gmxViewerUI.hideLogo) ? 'emptyLogo' : 'logo';
	var logoDiv = _div(null, [['dir','className', logoDivClass],['attr','hidable',true]]);
	
	if ( typeof window.gmxViewerUI != 'undefined' &&  window.gmxViewerUI.logoImage )
		logoDiv.style.background = "transparent url(" + window.gmxViewerUI.logoImage + ") no-repeat scroll 0 0";
	
	var td = _td(null, [['attr','vAlign','top']]),
		table = _table([_tbody([_tr([_td([logoDiv, _div(null,[['dir','className','leftIconPanel'],['attr','id','leftIconPanel']])],[['css','width','360px'],['attr','vAlign','top'],['css','background','transparent url(img/gradHeader.png) repeat-x 0px 0px']]),
									 td])])],[['css','width','100%']]);
	
	_(td, [_div([_div(null, [['attr','id','headerLinks'],['dir','className','headerLinks']]),
		   _div(null, [['attr','id','menu'],['dir','className','upMenu']])], [['css','background','transparent url(img/gradHeader.png) repeat-x 0px 0px'],['attr','hidable',true]]),
		   _div(null, [['attr','id','iconPanel'],['dir','className','iconPanel']])]);
	
	_($$('header'), [table])
	
	var loading = _table([_tbody([_tr([_td([_img(null, [['attr','src','img/loader.gif']])],[['attr','vAlign','center'],['css','textAlign','center']])])])], [['css','width','100%'],['css','height','100%']]);
	
	_($$('flash'), [loading]);
}

var parseURLParams = function()
{
    var q = window.location.search,
        kvp = (q.length > 1) ? q.substring(1).split("&") : [];

    for (var i = 0; i < kvp.length; i++)
    {
        kvp[i] = kvp[i].split("=");
    }
    
    var params = {},
        givenMapName = false;
        
    for (var j=0; j < kvp.length; j++)
    {
        if (kvp[j].length == 1)
        {
            if (!givenMapName)
                givenMapName = decodeURIComponent(kvp[j][0]);
        }
        else
            params[kvp[j][0]] = kvp[j][1];
    }
    
    return {params: params, givenMapName: givenMapName};
}

$(function()
{
    Mustache.addCustomTag('i', function (contents, value) {
        return nsGmx.Translations.getText(contents);
    });
    
    $('body').on('keyup', function(event) {
        if ((event.target === document.body || $(event.target).hasClass('leaflet-container')) && event.keyCode === 79) {
            _queryMapLayers.getMaps();
            return false;
        }
    })
    
    var languageFromSettings = translationsHash.getLanguageFromCookies() || window.defaultLang;
    window.language = languageFromSettings || "rus"
	if (languageFromSettings == "eng")
		window.KOSMOSNIMKI_LANGUAGE = "English";
	
	window.shownTitle =  window.pageTitle || _gtxt('ScanEx Web Geomixer - просмотр карты');
	document.title = window.shownTitle;
    
    window.serverBase = _serverBase;
    
    addParseResponseHook('*', function(response, customErrorDescriptions) {
        if (response.Warning) {
            //мы дожидаемся загрузки дерева слоёв, чтобы не добавлять notification widget слишком рано (до инициализации карты в контейнере)
            _queryMapLayers.loadDeferred.then(function() {
                nsGmx.widgets.notifications.stopAction(null, 'warning', response.Warning, 0);
            });
        }
    })
    
    //при каждой ошибке от сервера будем показывать диалог с ошибкой и стектрейсом.
    addParseResponseHook('error', function(response, customErrorDescriptions) {
        if (typeof customErrorDescriptions !== 'undefined' && response.ErrorInfo.ExceptionType in customErrorDescriptions)
        {
            var canvas = _div([_t(customErrorDescriptions[response.ErrorInfo.ExceptionType])], [['dir', 'className', 'CustomErrorText']]);
            showDialog(_gtxt("Ошибка!"), canvas, 220, 100);
        }
        else
        {
            var canvas = _div([_div([_t([String(response.ErrorInfo.ErrorMessage)])],[['css','color','red']])]),
                textarea = false,
                resize = function()
                {
                    if (textarea)
                        textarea.style.height = textarea.parentNode.parentNode.offsetHeight - canvas.firstChild.offsetHeight - 6 + 'px';
                }
            
            if (typeof response.ErrorInfo.ExceptionType != 'undefined' && response.ErrorInfo.ExceptionType != '' && response.ErrorInfo.StackTrace != null)
            {
                textarea = _textarea(null,[['dir','className','inputStyle error'],['css','width','100%'],['css','padding','0px'],['css','margin','0px'],['css','border','none']]);
                
                textarea.value = response.ErrorInfo.StackTrace;
                _(canvas, [textarea]);
            }
            
            showDialog(_gtxt("Ошибка сервера"), canvas, 220, 170, false, false, resize)
            
            if (typeof response.ErrorInfo.ExceptionType != 'undefined' && response.ErrorInfo.ExceptionType != '' && response.ErrorInfo.StackTrace != null)
                resize();
                
            canvas.parentNode.style.overflow = 'hidden';
            
            return false;
        }
    })
    
    _translationsHash.addErrorHandler(function(text) {
        showErrorMessage("Не найдено тектовое описание для \"" + text + "\"");
    })
    
    nsGmx.pluginsManager = new (gmxCore.getModule('PluginsManager').PluginsManager)();
    
    //сейчас подгружаются все глобальные плагины + все плагины карт, у которых нет имени в конфиге
    nsGmx.pluginsManager.done(function()
    {
        nsGmx.AuthManager.checkUserInfo(function()
        {
            var rightLinks = [];
            if (nsGmx.AuthManager.isRole(nsGmx.ROLE_ADMIN)) {
                rightLinks.push({
                    title: _gtxt('Администрирование'),
                    link: serverBase + 'Administration/SettingsAdmin.aspx'
                })
            }
            
            nsGmx.pluginsManager.beforeMap();
            nsGmx.widgets.header = new nsGmx.Controls.HeaderWidget($('.header'), {
                leftLinks: [{
                    title: _gtxt("Карта пожаров"),
                    link: "http://fires.kosmosnimki.ru"
                },
                {
                    title: _gtxt("Поиск снимков"),
                    link: "http://search.kosmosnimki.ru"
                },
                {
                    title: _gtxt("Платформа Геомиксер"),
                    active: true
                }], 
                rightLinks: rightLinks,
                logo: window.gmxViewerUI && window.gmxViewerUI.logoImage
            });
            
            nsGmx.widgets.languageWidget = new nsGmx.Controls.LanguageWidget(nsGmx.widgets.header.getLanguagePlaceholder());
        
            window.LeafletPlugins = window.LeafletPlugins || [];
            var apikeyParam = window.apiKey ? '?key=' + window.apiKey : '';

            var parsedURL = parseURLParams();
            var apiFilename;
            if (parsedURL.params['apifile'])
            {
                apiFilename = parsedURL.params['apifile'] + '.js';
            }
            else
            {
                if (typeof window.gmxUseLeaflet !== 'undefined') {
                    apiFilename = window.gmxUseLeaflet ? 'apil.js' : 'apif.js';
                } else {
                    apiFilename = 'api.js';
                }
            }
            
            var url = _mapHostName + apiFilename + apikeyParam;
            
            gmxCore.loadScript(url, null, 'windows-1251').then(function() {
                gmxAPI.whenLoaded(parseReferences.bind(null, parsedURL.params, parsedURL.givenMapName));
            })

        }, function()
        {
            //TODO: обработка ошибок
        })
    })
});

function parseReferences(params, givenMapName)
{
    window.documentHref = window.location.href.split("?")[0];
    
    if (params["permalink"])
    {
        eraseCookie("TinyReference");
        createCookie("TinyReference", params["permalink"]);
        
        window.location.replace(documentHref + (givenMapName ? ("?" + givenMapName) : ""));
        return;
    }
    
    var defaultState = { isFullScreen: params["fullscreen"] == "true" || params["fullscreen"] == "false" ? params["fullscreen"] : "false" };
    
    if ("x" in params && "y" in params && "z" in params &&
        !isNaN(Number(params.x)) && !isNaN(Number(params.y)) && !isNaN(Number(params.z)))
        defaultState.position = {x: Number(params.x), y: Number(params.y), z: Number(params.z)}
    
    if ("mx" in params && "my" in params &&
        !isNaN(Number(params.mx)) && !isNaN(Number(params.my)))
        defaultState.marker = {mx: Number(params.mx), my: Number(params.my), mt: "mt" in params ? params.mt : false}
    
    if ("mode" in params)
        defaultState.mode = params.mode;
        
    if ("dt" in params) {
        defaultState.dt = params.dt;
    }
    
    window.defaultMapID = typeof window.defaultMapID !== 'undefined' ? window.defaultMapID : 'DefaultMap';
    
    var mapName = window.defaultMapID && !givenMapName ? window.defaultMapID : givenMapName;
    
    window.globalMapName = mapName;
    
    if (!window.globalMapName)
    {
        // нужно прописать дефолтную карту в конфиге
        alert(_gtxt("$$phrase$$_1"))
        
        return;
    }
    else
        checkUserInfo(defaultState);
}

function checkUserInfo(defaultState)
{
    var tinyRef = readCookie("TinyReference");
    
    if (tinyRef)
    {
        eraseCookie("TinyReference");
        _mapHelper.restoreTinyReference(tinyRef, function(obj)
        {
            if (obj.mapName) {
                window.globalMapName = obj.mapName;
            }
            loadMap(obj);
        }, function()
        {
            loadMap(defaultState); //если пермалинк какой-то не такой, просто открываем дефолтное состояние
        });
        
        var tempPermalink = readCookie("TempPermalink");
        
        if (tempPermalink && tempPermalink == tinyRef)
        {
            nsGmx.Utils.TinyReference.remove(tempPermalink);
            eraseCookie("TempPermalink");
        }
    }
    else
        loadMap(defaultState);
}

nsGmx.widgets.commonCalendar = {
    _calendar: null,
    _isAppended: false,
    _unbindedTemporalLayers: {},
    get: function()
    {
        var _this = this;
        if (!this._calendar)
        {
            this._calendar = new nsGmx.Calendar();
            this._calendar.init('CalendarCommon', {
                minimized: true,
                dateMin: new Date(2000, 01, 01),
                dateMax: new Date(),
                showTime: false
            });
            
            this._calendar.setTimeBegin(0, 0, 0);
            this._calendar.setTimeEnd(23, 59, 59);
            
            _mapHelper.customParamsManager.addProvider({
                name: 'commonCalendar',
                loadState: function(state) { _this._calendar.loadState(state); $(_this._calendar).change(); },
                saveState: function() { return _this._calendar.saveState(); }
            });
            
            $(this._calendar).change(this._updateTemporalLayers.bind(this));
            this._updateTemporalLayers();
            
            //depricated: use nsGmx.widgets.commonCalendar.(un)bindLayer
            this._calendar.bindLayer = this.bindLayer.bind(this);
            this._calendar.unbindLayer = this.unbindLayer.bind(this);
        }

        return this._calendar;
    },
    show: function()
    {
        var doAdd = function() {
            var calendarDiv = $("<div/>").append(this.get().canvas);
            _queryMapLayers.getContainerBefore().append(calendarDiv);
        }.bind(this);
        
        if (!this._isAppended)
        {
            this._isAppended = true;
            //явная проверка, так как хочется быть максимально синхронными в этом методе
            if (_queryMapLayers.loadDeferred.state() === 'resolved') {
                doAdd();
            } else {
                _queryMapLayers.loadDeferred.then(doAdd);
            }
        }
    },
    hide: function()
    {
        this._isAppended && $(this.get().canvas).hide();
        this._isAppended = false;
    },
    
    bindLayer: function(layerName)
    {
        delete this._unbindedTemporalLayers[layerName];
        this._updateTemporalLayers();
    },
    unbindLayer: function(layerName)
    {
        this._unbindedTemporalLayers[layerName] = globalFlashMap.layers[layerName];
    },
    _updateOneLayer: function(layer, dateBegin, dateEnd)
    {
        if (layer.properties.maxShownPeriod)
        {
            //var layerPeriod = layer.properties.TemporalPeriods[0]*24*3600*1000 - 1000;
            //var newDateBegin = layerPeriod < dateEnd.valueOf() - dateBegin.valueOf() ? new Date(dateEnd.valueOf() - layerPeriod) : dateBegin;
            var msecPeriod = layer.properties.maxShownPeriod*24*3600*1000;
            var newDateBegin = new Date( Math.max(dateBegin.valueOf(), dateEnd.valueOf() - msecPeriod));
            layer.setDateInterval(newDateBegin, dateEnd);
        }
        else
            layer.setDateInterval(dateBegin, dateEnd);
    },
    _updateTemporalLayers: function()
    {
        var dateBegin = this._calendar.getDateBegin(),
            dateEnd = this._calendar.getDateEnd();
        
        if (dateBegin.valueOf() == dateEnd.valueOf())
            dateBegin = new Date(dateBegin.valueOf() - 1000*3600*24);
        
        for (var i = 0; i < globalFlashMap.layers.length; i++)
        {
            var name = globalFlashMap.layers[i].properties.name;
            if (!(name in this._unbindedTemporalLayers))
                this._updateOneLayer(globalFlashMap.layers[i], dateBegin, dateEnd);
        }
    }
}

//устарело, используйте commonCalendar
nsGmx.widgets.getCommonCalendar = function()
{
    nsGmx.widgets.commonCalendar.show();
    return nsGmx.widgets.commonCalendar.get();
}

//Отслеживаем изменения календарика и фильтруем все мультивременные слои относительно выбранного периода. 
//Если выбран не период, а просто дата - фильтруем за последние сутки относительно этой даты
function filterTemporalLayers()
{
    for (var i = 0; i < globalFlashMap.layers.length; i++) {
        var props = globalFlashMap.layers[i].properties;
        if (props.Temporal && !(props.name in nsGmx.widgets.commonCalendar._unbindedTemporalLayers)) {
            nsGmx.widgets.commonCalendar.show();
            return;
        }
    }
}

function addMapName(container, name)
{
    var parent;
    if (!$$('iconMapName'))
    {
        var div = _div([_t(name)], [['attr','id','iconMapName'], ['dir','className','iconMapName']])
            td = _td([div],[['css','paddingTop','2px']]);
        
        _(container, [_table([_tbody([_tr(
            [_td([_t(_gtxt("Карта"))], [['css','color','#153069'],['css','fontSize','12px'],['css','paddingTop','2px'],['css','fontFamily','tahoma'], ['css','height','30px']]),
                      _td([_div(null,[['dir','className','markerRight']])],[['attr','vAlign','top'],['css','paddingTop','10px']]),
                       td]
                       )])])]);
    }
    else
    {
        removeChilds($$('iconMapName'));
        
        $($$('iconMapName'), [_t(name)])
    }
}

window.resizeAll = function()
{
	var top = 0,
		bottom = 0,
		right = 0,
		left = layersShown ? 360 : 12,
        headerHeight = $('#header').height();
	
	$$("flash").style.left = left + 'px';
	$$("flash").style.top = top + 'px';
	$$("flash").style.width = getWindowWidth() - left - right + 'px';
	$$("flash").style.height = getWindowHeight() - top - headerHeight - bottom + 'px';
    
    window.globalFlashMap && window.globalFlashMap.checkMapSize();
	
	if (layersShown)
	{
		show($$("leftMenu"));
        
        var baseHeight = getWindowHeight() - top - bottom - headerHeight;
        
        $$("leftMenu").style.height = baseHeight + 'px'
        
        $$("leftContent").style.top = $$("leftPanelHeader").offsetHeight + 'px';
		$$("leftContent").style.height = baseHeight -
            $$("leftPanelHeader").offsetHeight - 
            $$("leftPanelFooter").offsetHeight + 'px';
	}
	else
	{
		hide($$("leftMenu"))

		// jQuery("#header").find("[hidable]").css("display",'none')
		// $$('header').style.height = '35px';
	}
}

var isEditUIInitialized = false;
function initEditUI() {
    if (isEditUIInitialized) {
        return;
    }
    
    var isEditableLayer = function(layer) {
        var layerRights = _queryMapLayers.layerRights(layer.properties.name);
        return layer.properties.type === 'Vector' &&
            'tilesVers' in layer.properties &&
            (layerRights === 'edit' || layerRights === 'editrows');
    }
    
    var hasEditableLayer = false;
    for (var iL = 0; iL < globalFlashMap.layers.length; iL++)
        if (isEditableLayer(globalFlashMap.layers[iL]))
        {
            hasEditableLayer = true;
            break;
        }
        
    if (!hasEditableLayer) return;
    
    //добавляем пункт меню к нарисованным объектам
    nsGmx.ContextMenuController.addContextMenuElem({
        title: _gtxt("EditObject.drawingMenuTitle"),
        isVisible: function(context)
        {
            var active = $(_queryMapLayers.treeCanvas).find(".active");
            
            //должен быть векторный слой
            if ( !active[0] || !active[0].parentNode.getAttribute("LayerID") ||
                 !active[0].parentNode.gmxProperties.content.properties.type === "Vector")
            {
                return false;
            }
            
            //TODO: проверить тип геометрии
            
            var layer = globalFlashMap.layers[active[0].parentNode.gmxProperties.content.properties.name];
            
            //слой поддерживает редактирование и у нас есть права на это
            return isEditableLayer(layer);
        },
        clickCallback: function(context)
        {
            var active = $(_queryMapLayers.treeCanvas).find(".active");
            var layer = globalFlashMap.layers[active[0].parentNode.gmxProperties.content.properties.name];
            new nsGmx.EditObjectControl(layer.properties.name, null, {drawingObject: context.obj});
        }
    }, 'DrawingObject');
    
    //добавляем пункт меню ко всем слоям
    nsGmx.ContextMenuController.addContextMenuElem({
        title: _gtxt("EditObject.menuTitle"),
        isVisible: function(context)
        {
            var layer = globalFlashMap.layers[context.elem.name];
            return !context.layerManagerFlag && isEditableLayer(layer);
        },
        clickCallback: function(context)
        {
            new nsGmx.EditObjectControl(context.elem.name);
        }
    }, 'Layer');
    
    //добавляем тул в тублар карты
    var listeners = {};
    var pluginPath = gmxCore.getModulePath('EditObjectPlugin');
    
    var editIcon = new L.Control.gmxIcon({
        id: 'editTool',
        title: _gtxt("Редактировать"),
        togglable: true,
        addBefore: 'createLayer'
    }).addTo(gmxAPI._leaflet.LMap);
        
    editIcon.on('statechange', function() {
        if (editIcon.options.isActive) {
            for (var iL = 0; iL < globalFlashMap.layers.length; iL++)
            {
                var layer = globalFlashMap.layers[iL];
                if (isEditableLayer(layer))
                {
                    layer.disableFlip();
                    
                    listeners[layer.properties.name] = listeners[layer.properties.name] || [];
                    for (var iF = 0; iF < layer.filters.length; iF++) {
                        var listenerId = layer.filters[iF].addListener('onClick', function(attr)
                        {
                            var obj = attr.obj;
                            var layer = attr.attr.layer;
                            var id = obj.properties[layer.properties.identityField];
                            layer.bringToTopItem(id);
                            new nsGmx.EditObjectControl(layer.properties.name, id);
                            return true; // oтключить дальнейшую обработку события
                        });
                        
                        //listeners.push({layerName: layer.properties.name, listenerId: listenerId});
                        listeners[layer.properties.name].push(listenerId);
                    }
                }
            }
        } else {
            //for (var i = 0; i < listeners.length; i++) {
            for (var layerName in listeners) {
                var pt = listeners[layerName];
                var layer = globalFlashMap.layers[layerName];
                if (layer) {
                    for (var iF = 0; iF < layer.filters.length; iF++) {
                        layer.filters[iF] && layer.filters[iF].removeListener('onClick', pt[iF]);
                    }
                    layer.enableFlip();
                }
            }
            listeners = {};            
        }
    });
    
    isEditUIInitialized = true;
}

function loadMap(state)
{
	layersShown = (state.isFullScreen == "false");
	
	if (state.language)
	{
		window.language = state.language;
		translationsHash.updateLanguageCookies(window.language);
	}
	
	window.onresize = resizeAll;
	resizeAll();
    
    // При залогиневании пользователя просто перезагружаем страницу
    // Если reloadAfterLoginFlag=true, не сохраняем текущее состояние карты, 
    // иначе сохраняем всё в пермалинке и восстанавливаем после перезагрузки
    var defaultLoginCallback = function(reloadAfterLoginFlag)
    {
        return function()
        {
            if (reloadAfterLoginFlag)
                window.location.reload();
            else
                _mapHelper.reloadMap();
        }
    }
	
    var success = createFlashMap($$("flash"), window.serverBase, globalMapName, function(map, data)
	{
        //если информации о языке нет ни в куках ни в config.js, то используем данные о языке из карты
        if (!translationsHash.getLanguageFromCookies() && !window.defaultLang && data) {
            window.language = data.properties.DefaultLanguage;
        }
        
        if (map && map.baseLayersManager) {
            var baseLayersControl = new nsGmx.BaseLayersControl(map.baseLayersManager, {
                language: nsGmx.Translations.getLanguage()
            });
        
            baseLayersControl.addTo(gmxAPI._leaflet.LMap);
        }
        
        $('#flash').bind('dragover', function()
        {
            return false;
        });
        
        if (map && map.controlsManager) {
            var layers = map.controlsManager.getCurrent().getControl('layers');
            if (layers) {
                  layers.options.hideBaseLayers = true;
                  layers._update();
            }
        }
        
        $('#flash').bind('drop', function(e)
        {
            if (!e.originalEvent.dataTransfer) {
                return;
            }
            
            var b = getBounds();
            var defs = [];
            $.each(e.originalEvent.dataTransfer.files, function(i, file) {
                var def = $.Deferred();
                var parseDef = nsGmx.Utils.parseShpFile(file);
                defs.push(def);
                parseDef.then(
                    function(objs) {
                        for (var i = 0; i < objs.length; i++) {
                            b.update(objs[i].geometry.coordinates);
                            map.drawing.addObject(objs[i].geometry, objs[i].properties);
                        }
                        def.resolve();
                    },
                    function() {
                        def.resolve();
                    }
                );
            })
            
            $.when.apply($, defs).done(function() {
                if ( b.minX < b.maxX && b.minY < b.maxY ) {
                    globalFlashMap.zoomToExtent(b.minX, b.minY, b.maxX, b.maxY);
                }
            })
            
            return false;
        })
        
		globalFlashMap = map;
        var userObjects = state.userObjects || (data && data.properties.UserData);
        
        userObjects && _userObjects.setData(JSON.parse(userObjects));
        
        if (state.dt) {
            try {
                var dateLocal = $.datepicker.parseDate('dd.mm.yy', state.dt);
                var dateBegin = nsGmx.Calendar.fromUTC(dateLocal);
                var dateEnd = new Date(dateBegin.valueOf() + 24*3600*1000 - 1);
                var calendar = nsGmx.widgets.commonCalendar.get();
                calendar.setDateBegin(dateBegin, true);
                calendar.setDateEnd(dateEnd);
            } catch(e) {}
        }
        
        //в самом начале загружаем только данные о плагинах карты. 
        //Остальные данные будем загружать чуть позже после частичной инициализации вьюера
        //О да, формат хранения данных о плагинах часто менялся! 
        //Поддерживаются все предыдущие форматы из-за старых версий клиента и сложности обновления базы данных
        _userObjects.load('mapPlugins');
        _userObjects.load('mapPlugins_v2');
        _userObjects.load('mapPlugins_v3');
        
        //после загрузки списка плагинов карты начали загружаться не глобальные плагины, 
        //у которых имя плагина было прописано в конфиге. Ждём их загрузки.
        nsGmx.pluginsManager.done(function()
        {
            nsGmx.pluginsManager.beforeViewer();
            
            //для каждого ответа сервера об отсутствии авторизации (Status == 'auth') сообщаем об этом пользователю или предлагаем залогиниться
            addParseResponseHook('auth', function() {
                if ( nsGmx.AuthManager.isLogin() )
                {
                    showErrorMessage(_gtxt("Недостаточно прав для совершения операции"), true);
                }
                else
                {
                    nsGmx.widgets.authWidget.showLoginDialog();
                }
                
                return false;
            });
            
            var nativeAuthWidget = new nsGmx.AuthWidget($('<div/>')[0], nsGmx.AuthManager, defaultLoginCallback(true));
            
            // прокси между nsGmx.AuthManager редактора и AuthManager'а из общей библиотеки
            var authManagerProxy = {
                getUserInfo: function(){
                    var def = $.Deferred();
                    nsGmx.AuthManager.checkUserInfo(function() {
                        var auth = nsGmx.AuthManager;
                        def.resolve({
                            Status: 'ok',
                            Result: {
                                Login: auth.getFullname() || auth.getNickname() || auth.getLogin()
                            }
                        });
                    })
                    return def;
                },
                
                login: function(){
                    nativeAuthWidget.showLoginDialog();
                },
                
                logout: function(){
                    var def = $.Deferred();
                    nsGmx.AuthManager.logout(function() {
                        def.resolve({Status: 'ok', Result: {}});
                        _mapHelper.reloadMap();
                    });
                    return def;
                }
            };
            nsGmx.widgets.authWidget = new nsGmx.Controls.AuthController(nsGmx.widgets.header.getAuthPlaceholder()[0], {authManager: authManagerProxy});
            
            //ugly hack
            nsGmx.widgets.authWidget.showLoginDialog = nativeAuthWidget.showLoginDialog.bind(nativeAuthWidget);
            
            if (!data)
            {
                _menuUp.defaultHash = 'usage';
                
                _menuUp.createMenu = function()
                {
                    createDefaultMenu();
                    nsGmx.pluginsManager.addMenuItems(_menuUp);
                };
                
                _menuUp.go(nsGmx.widgets.header.getMenuPlaceholder()[0]);
                
                if ($$('left_usage'))
                    hide($$('left_usage'))
                                    
                _menuUp.checkView();
                
                nsGmx.widgets.notifications.stopAction(null, 'failure', _gtxt("У вас нет прав на просмотр данной карты"), 0);
                
                window.onresize = resizeAll;
                resizeAll();
                
                state.originalReference && createCookie("TinyReference", state.originalReference);
                
                nsGmx.widgets.authWidget.showLoginDialog();
                
                return;
            }
            
            //инициализация контролов пользовательских объектов
            //соответствующий модуль уже загружен
            var oDrawingObjectsModule = gmxCore.getModule("DrawingObjects");
            window.oDrawingObjectGeomixer = new oDrawingObjectsModule.DrawingObjectGeomixer();
            window.oDrawingObjectGeomixer.Init(globalFlashMap);
            
            //для всех слоёв должно выполняться следующее условие: если хотя бы одна групп-предков невидима, то слой тоже невидим.
            (function fixVisibilityConstrains (o, isVisible)
            {
                o.content.properties.visible = o.content.properties.visible && isVisible;
                isVisible = o.content.properties.visible;
                if (o.type === "group")
                {
                    var a = o.content.children;
                    for (var k = a.length - 1; k >= 0; k--)
                        fixVisibilityConstrains(a[k], isVisible);
                }
            })({type: "group", content: { children: data.children, properties: { visible: true } } }, true);
            
            window.oldTree = JSON.parse(JSON.stringify(data));
            
            window.defaultLayersVisibility = {};
            if (map.layers)
            {
                for (var k = 0; k < map.layers.length; k++)
                    window.defaultLayersVisibility[map.layers[k].properties.name] = typeof map.layers[k].isVisible != 'undefined' ? map.layers[k].isVisible : false;
            }
            
            //основная карта всегда загружена с того-же сайта, что и серверные скрипты
            data.properties.hostName = window.serverBase.slice(7).slice(0, -1); 
            
            //DEPRICATED. Do not use it!
            _mapHelper.mapProperties = data.properties;
            
            //DEPRICATED. Do not use it!
            _mapHelper.mapTree = data;
            
            if (window.copyright)
                map.setCopyright(window.copyright);
            
            if (state.position)
            {
                map.moveTo(state.position.x, state.position.y, state.position.z);
            }
            
            if ( !data.properties.UseKosmosnimkiAPI && map.miniMap )
            {
                for (var i = 0; i < map.layers.length; i++)
                {
                    var layer = map.layers[i];
                    if (layer && layer.properties.type == "Raster")
                    {
                        map.miniMap.addLayer(layer, false);
                        layer.miniLayer = map.miniMap.layers[map.miniMap.layers.length - 1];
                    }
                }
            }
            
            var condition = false,
                mapStyles = false;
            
            if (state.condition)
                condition = state.condition;
            
            if (state.mapStyles)
                mapStyles = state.mapStyles;
            
            _queryMapLayers.addLayers(data, condition, mapStyles);
            
            var headerDiv = $('<div class="mainmap-title">' + data.properties.title + '</div>').appendTo($('body'));
            nsGmx.ContextMenuController.bindMenuToElem(headerDiv[0], 'Map', function()
                {
                    return _queryMapLayers.currentMapRights() == "edit";
                },
                function() 
                {
                    return {
                        div: $(_layersTree._treeCanvas).find('div[MapID]')[0],
                        tree: _layersTree
                    }
                }
            );
            
            // _menuUp.defaultHash = 'layers';
            mapLayers.mapLayers.load();
            
            //создаём тулбар
            var iconContainer = _div(null, [['css', 'borderLeft', '1px solid #216b9c']]);
            
            var searchContainer = nsGmx.widgets.header.getSearchPlaceholder()[0];
            
            //инициализация контролов поиска (модуль уже загружен)
            var oSearchModule = gmxCore.getModule("search");
            window.oSearchControl = new oSearchModule.SearchGeomixer();
            
            // if (document.getElementById('searchCanvas')) {
            window.oSearchControl.Init({
                Menu: oSearchLeftMenu,
                ContainerInput: searchContainer,
                ServerBase: globalFlashMap.geoSearchAPIRoot,
                layersSearchFlag: true,
                mapHelper: _mapHelper,
                Map: globalFlashMap
            });
            // }
            
            _menuUp.createMenu = function()
            {
                createMenuNew();
            };

            _menuUp.go(nsGmx.widgets.header.getMenuPlaceholder()[0]);
            
            // Загружаем все пользовательские данные
            _userObjects.load();
            
            //динамически добавляем пункты в меню. DEPRICATED.
            nsGmx.pluginsManager.addMenuItems(_menuUp);
            
            // конвертируем старый формат eval-строки в новый формат customParamsManager
            // старый формат использовался только маплетом пожаров
            if (typeof state.customParams != 'undefined' && state.customParams)
            {
                var newFiresFormat = mapCalendar.convertEvalState(state.customParams);
                if (newFiresFormat)
                    state.customParamsCollection = { firesWidget : newFiresFormat };
                else
                {
                    //старый формат данных пожаров...
                    try
                    {
                        eval(state.customParams);
                    }
                    catch (e) 
                    {
                        alert(e);
                    }
                }
            }
                
            if ( typeof state.customParamsCollection != 'undefined')
                _mapHelper.customParamsManager.loadParams(state.customParamsCollection);

            _mapHelper.gridView = false;
            
            //создаём иконку переключения в полноэкранный режим.
            var mapNameContainer = _div();
            var leftIconPanelContainer = _div();
            addMapName(mapNameContainer, data.properties.title);
            
            _leftIconPanel.create(leftIconPanelContainer);
            
            //добавим в тулбар две иконки, но видимой будет только одна
            //по клику переключаем между ними
            /*var _toggleFullscreenIcon = function(isFullScreen)
            {
                _leftIconPanel.setVisible('fullscreenon', !isFullScreen);
                _leftIconPanel.setVisible('fullscreenoff', isFullScreen);
                layersShown = !layersShown;
                resizeAll();
            }
            */
            
            var updateLeftPanelVis = function() {
                $('.leftCollapser-icon')
                    .toggleClass('leftCollapser-right', !layersShown)
                    .toggleClass('leftCollapser-left', !!layersShown);
                resizeAll();
            }
            
            $('#leftCollapser').click(function() {
                layersShown = !layersShown;
                updateLeftPanelVis();
            });
            updateLeftPanelVis();
            
            var lmap = gmxAPI._leaflet.LMap;
            
            //лупу совсем убираем
            //gmxAPI.map.controlsManager.getCurrent().removeControl('boxzoom');
            lmap.removeControl(lmap.gmxControlIconManager.get('boxzoom'));
            
            //пополняем тулбар
            var uploadFileIcon = new L.Control.gmxIcon({
                id: 'uploadFile', 
                title: _gtxt("Загрузить файл")
            }).on('click', drawingObjects.loadShp.load.bind(drawingObjects.loadShp));
            
            lmap.gmxControlIconManager.get('drawing').addIcon(uploadFileIcon);
            
            var printIcon = new L.Control.gmxIcon({
                id: 'print',
                title: _gtxt('Печать')
            })
                .addTo(lmap)
                .on('click', _mapHelper.print.bind(_mapHelper));
            
            var permalinkIcon = new L.Control.gmxIcon({
                id: 'permalink',
                title: _gtxt('Ссылка на карту')
            })
                .addTo(lmap)
                .on('click', _mapHelper.showPermalink.bind(_mapHelper));
            
            
            var gridIcon = new L.Control.gmxIcon({
                id: 'gridTool', 
                title: _gtxt("Координатная сетка"),
                togglable: true
            })
                .addTo(lmap)
                .on('click', function() {
                    var isActive = gridIcon.options.isActive;
                    gridManager.setState(isActive);
                });
            
            if (_queryMapLayers.currentMapRights() === "edit") {
                //группа создания слоёв
                var createVectorLayerIcon = new L.Control.gmxIcon({
                    id: 'createVectorLayer', 
                    title: _gtxt("Создать векторный слой"),
                }).on('click', _mapHelper.createNewLayer.bind(_mapHelper, 'Vector'));
                
                var createRasterLayerIcon = new L.Control.gmxIcon({
                    id: 'createRasterLayer', 
                    title: _gtxt("Создать растровый слой"),
                }).on('click', _mapHelper.createNewLayer.bind(_mapHelper, 'Raster'));
                
                var createLayerIconGroup = new L.Control.gmxIconGroup({
                    id: 'createLayer',
                    isSortable: true,
                    //isCollapsible: false,
                    items: [createVectorLayerIcon, createRasterLayerIcon]
                }).addTo(lmap);
                
                var bookmarkIcon = new L.Control.gmxIcon({
                    id: 'bookmark',
                    title: _gtxt("Добавить закладку")
                }).on('click', function() {
                    mapHelp.tabs.load('mapTabs');
                    _queryTabs.add();
                }).addTo(lmap);
                
                var saveMapIcon = new L.Control.gmxIcon({
                    id: 'saveMap', 
                    title: _gtxt("Сохранить карту")
                })
                    .addTo(lmap)
                    .on('click', _queryMapLayers.saveMap.bind(_queryMapLayers));
            }

            // var ToolsGroup = new L.Control.gmxIconGroup({
                // id: 'toolsGroup',
                // isSortable: true,
                // items: [gridIcon, bookmarkIcon]
            // }).addTo(lmap);
            
            //--------------------------------------

            /*_leftIconPanel.add('fullscreenon', _gtxt("Развернуть карту"), "img/toolbar/fullscreenon.png", "img/toolbar/fullscreenon_a.png", 
                               function() { _toggleFullscreenIcon(true); });
            
            _leftIconPanel.add('fullscreenoff', _gtxt("Свернуть карту"), "img/toolbar/fullscreenoff.png", "img/toolbar/fullscreenoff_a.png", 
                                function() { _toggleFullscreenIcon(false); }, null, true);*/
            
            //если в карте новый тип контролов, пермалинк из тулбаров перекачёвывает в контролы карты
            if (map.controlsManager && !map.controlsManager.getControl('permalink')) {
                _iconPanel.add('permalink', _gtxt("Ссылка на карту"), "img/toolbar/save.png", "img/toolbar/save_a.png", function(){_mapHelper.showPermalink();})
            }
            
            if (nsGmx.AuthManager.isRole(nsGmx.ROLE_ADMIN))
            {
                if ($('#headerLinks').length) {
                    $('#headerLinks').append(_a([_t(_gtxt('Администрирование'))], [['dir', 'href', serverBase + 'Administration/SettingsAdmin.aspx'], ['attr','target','_blank'], ['css', 'marginTop', '7px'], ['css', 'fontWeight', 'bold']]));
                }
            }
            
            nsGmx.addHeaderLinks($$('headerLinks'));
            
            state.mode && map.setMode(state.mode);
            
            if (state.drawnObjects)
            {
                for (var i = 0; i < state.drawnObjects.length; i++)
                {
                    var color = state.drawnObjects[i].color || 0x0000FF,
                        thickness = state.drawnObjects[i].thickness || 3,
                        opacity = state.drawnObjects[i].opacity || 80,
                        elem = map.drawing.addObject(state.drawnObjects[i].geometry, state.drawnObjects[i].properties);
                    
                    elem.setStyle({outline: {color: color, thickness: thickness, opacity: opacity }});
                    
                    if ( 'isBalloonVisible' in state.drawnObjects[i] ) 
                        elem.balloon.setVisible( state.drawnObjects[i].isBalloonVisible );
                }
            }
            else if (state.marker)
                map.drawing.addObject({ type: "POINT", coordinates: [state.marker.mx, state.marker.my] }, { text: state.marker.mt });
            
            _menuUp.checkView();
            
            _iconPanel.updateVisibility();
            
            if (nsGmx.AuthManager.isLogin())
            {
                _queryMapLayers.addUserActions();
                
                if ( !nsGmx.AuthManager.isAccounts() )
                {
                    _iconPanel.updateVisibility();
                }
            }

            globalFlashMap.addListener('onLayerAdd', initEditUI);
            initEditUI();
            
            filterTemporalLayers();
            $(_queryExternalMaps).bind('map_loaded', filterTemporalLayers);
            
            nsGmx.pluginsManager.afterViewer();
            
            $("#leftContent").mCustomScrollbar();
        });
	})
	
	if (!success)
		$$("noflash").style.display = "block";
}

function promptFunction(title, value) {
    var ui = $(Mustache.render(
            '<div class="gmx-prompt-canvas">' +
                '<input class="inputStyle gmx-prompt-input" value="{{value}}">' +
            '</div>', {value: value})
        );
        
    ui.find('input').on('keydown', function(e) {
        var evt = e || window.event;
        if (e.which === 13)
        {
            globalFlashMap.moveToCoordinates(this.value);
            return false;
        }
    })

    showDialog(title, ui[0], 300, 80, false, false);
}

window.prompt = promptFunction;

};

})();