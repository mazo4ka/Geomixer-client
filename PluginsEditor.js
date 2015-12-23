﻿var nsGmx = nsGmx || {};

(function($){

_translationsHash.addtext("rus", {
                        "pluginsEditor.selectedTitle" : "Плагины карты",
                        "pluginsEditor.availableTitle" : "Доступные плагины",
                        "pluginsEditor.add" : "Добавить плагин",
                        "pluginsEditor.paramsTitle" : "Параметры плагина"
                     });
                     
_translationsHash.addtext("eng", {
                        "pluginsEditor.selectedTitle" : "Map plugins",
                        "pluginsEditor.availableTitle" : "Available plugins",
                        "pluginsEditor.add" : "Add plugin",
                        "pluginsEditor.paramsTitle" : "Parameter of plugin"
                     });


var MapPlugins = function()
{
    var _plugins = [];
    var _params = {};
    
    //вместо массива из одного элемента передаём сам элемент
    var normalizeParams = function(params) {
        var res = {};
        for (var p in params) {
            res[p] = params[p].length === 1 ? params[p][0] : params[p];
        }
        
        return res;
    }
    
    this.addPlugin = function(pluginName, pluginParams, onlyParams)
    {
        _params[pluginName] = pluginParams || _params[pluginName] || {};
        
        if (!onlyParams && _plugins.indexOf(pluginName) === -1) {
            _plugins.push(pluginName);
        }
        
        $(this).change();
        
        return true;
    }
    
    this.each = function(callback) {
        for (var p = 0; p < _plugins.length; p++) {
            callback(_plugins[p], _params[_plugins[p]] || {});
        }
    }
    
    this.remove = function(pluginName) {
        var nameIndex = _plugins.indexOf(pluginName);
        if (nameIndex !== -1) {
            _plugins.splice(nameIndex, 1);
            $(this).change();
        }
    }
    
    this.isExist = function(pluginName)
    {
        return _plugins.indexOf(pluginName) !== -1;
    }
    
    this.getPluginParams = function(pluginName) {
        return _params[pluginName];
    }
    
    this.setPluginParams = function(pluginName, pluginParams) {
        _params[pluginName] = pluginParams;
        $(this).change();
    }
    
    //обновляем используемость и параметры плагинов
    this.updateGeomixerPlugins = function() {
        for (var p = 0; p < _plugins.length; p++) {
            nsGmx.pluginsManager.setUsePlugin(_plugins[p], true);
        }
        
        for (var p in _params) {
            nsGmx.pluginsManager.updateParams(p, normalizeParams(_params[p]));
        }
    }
    
    this.load = function(data, version) {
        if (version === 1) {
            _plugins = data;
            _params = {};
        } else if (version === 2) {
            _plugins = [];
            _params = {};
            for (var p = 0; p < data.length; p++) {
                _plugins.push(data[p].name);
                _params[data[p].name] = data[p].params;
            }
        } else if (version === 3) {
            _plugins = data.plugins;
            
            //поддержка ошибки, которая прокралась в базу...
            if ($.isArray(data.params) && data.params.length === 0) {
                _params = {};
            } else {
                _params = data.params;
            }
        }
    }
    
    this.save = function(version) {
        if (version === 1) {
            return _plugins;
        } else if (version === 2) {
            var res = [];
            _plugins.forEach(function(name) {
                res.push({name: name, params: _params[name]});
            })
            return res;
        } else if (version === 3) {
            return {
                plugins: _plugins,
                params: _params
            }
        }
    }
}

var GeomixerPluginsWidget = function(container, mapPlugins)
{
    var _allPlugins = [];
    var isListActive = [];
    
    nsGmx.pluginsManager.forEachPlugin(function(plugin)
    {
        if ( plugin.pluginName && plugin.mapPlugin && (plugin.isPublic || nsGmx.AuthManager.isRole(nsGmx.ROLE_ADMIN)) )
        {
            _allPlugins.push({name: plugin.pluginName, isPublic: plugin.isPublic});
        }
    })
    
    //по алфавиту
    _allPlugins.sort(function(a, b) {
        return a.name > b.name ? 1 : -1;
    })
    
    var update = function()
    {
        $(container).empty();
        var pluginSelect = $('<select/>', {multiple: 'multiple', 'class': 'pluginEditor-pluginList'}).bind('focus', function()
        {
            isListActive = true;
        });
        
        for (var p = 0; p < _allPlugins.length; p++)
            if (!mapPlugins.isExist(_allPlugins[p].name)) {
                var pluginOption = $('<option/>').text(_allPlugins[p].name);
                if (!_allPlugins[p].isPublic)
                    pluginOption.addClass('pluginEditor-hiddenPluginOption');
                pluginSelect.append(pluginOption);
            }
                
        var pluginInput = $('<input/>', {'class': 'inputStyle inputFullWidth pluginEditor-pluginInput'}).bind('focus', function()
        {
            isListActive = false;
        });
        
        var addPluginButton = $('<button/>', {'class': 'pluginEditor-addButton'}).text(_gtxt("pluginsEditor.add")).click(function()
        {
            var selected = [];
            
            if (isListActive)
            {
                $(":selected", pluginSelect).each(function()
                {
                    selected.push($(this).val());
                })
            }
            else
            {
                if ( nsGmx.pluginsManager.getPluginByName(pluginInput.val()) )
                {
                    selected.push(pluginInput.val());
                }
                else
                {
                    inputError(pluginInput[0]);
                }
            }
            
            for (var sp = 0; sp < selected.length; sp++)
                mapPlugins.addPlugin( selected[sp] );
        })
        $(container)
            .append($('<div/>', {'class': 'pluginEditor-widgetHeader'}).text(_gtxt('pluginsEditor.availableTitle')))
            .append(pluginSelect).append($('<br/>'))
            .append(pluginInput).append($('<br/>'))
            .append(addPluginButton);
    }
    
    $(mapPlugins).change(update);
    update();
}

var paramsWidgets = {};

var MapPluginParamsWidget = function(mapPlugins, pluginName) {

    if (paramsWidgets[pluginName]) {
        return;
    };
    
    var FakeTagMetaInfo = function()
    {
        this.isTag = function(tag) { return true; }
        this.getTagType = function(tag) { return 'String'; }
        this.getTagDescription = function(tag) { return ''; }
        this.getTagArray = function() { return []; }
        this.getTagArrayExt = function() { return []; }
    };
    var fakeTagMetaInfo = new FakeTagMetaInfo();
    
    var pluginParams =  mapPlugins.getPluginParams(pluginName);
    var tagInitInfo = {};
    
    for (var tagName in pluginParams) {
        tagInitInfo[tagName] = {Value: pluginParams[tagName]};
    }
    
    var layerTags = new nsGmx.LayerTagsWithInfo(fakeTagMetaInfo, tagInitInfo);
    
    var container = $('<div/>');
    
    var pluginValues = new nsGmx.LayerTagSearchControl(layerTags, container);
    
    var updateParams = function() {
        var newParams = {};
        layerTags.eachValid(function(tagid, tag, value) {
            newParams[tag] = newParams[tag] || [];
            newParams[tag].push(value);
        })
        
        mapPlugins.setPluginParams(pluginName, newParams);
    }
    
    var dialogDiv = showDialog(
            _gtxt('pluginsEditor.paramsTitle') + " " + pluginName, 
            container[0], 
            {
                width: 320, 
                height: 200, 
                closeFunc: function() {
                    updateParams();
                    delete paramsWidgets[pluginName];
                }
            }
        );
    
    paramsWidgets[pluginName] = {
        update: updateParams,
        closeDialog: function() {
            $(dialogDiv).dialog('close');
        }
    };
    
}

var MapPluginsWidget = function(container, mapPlugins)
{
    var update = function()
    {
        container.empty();
        container.append($('<div/>', {'class': 'pluginEditor-widgetHeader'}).text(_gtxt('pluginsEditor.selectedTitle')));
        
        var globalPluginsToShow = [];
        nsGmx.pluginsManager.forEachPlugin(function(plugin) {
            if ( plugin.pluginName && !plugin.mapPlugin && !mapPlugins.isExist(plugin.pluginName) ) {
                globalPluginsToShow.push(plugin);
            }
        });
        
        globalPluginsToShow.sort(function(a, b) {
            return a.pluginName > b.pluginName ? 1 : -1;
        });
        
        globalPluginsToShow.forEach(function(plugin) {
            var editButton = makeImageButton("img/edit.png", "img/edit.png");
            $(editButton).addClass('pluginEditor-edit');
            editButton.onclick = function() {
                new MapPluginParamsWidget(mapPlugins, plugin.pluginName);
            }
            
            $('<div/>', {'class': 'pluginEditor-widgetElemCommon'})
                .append($('<span/>').text(plugin.pluginName))
                .append(editButton)
                .appendTo(container);
        })
        
        var mapPluginNames = [];
        mapPlugins.each(function(name) {
            mapPluginNames.push(name);
        });
        
        mapPluginNames.sort().forEach(function(name) {
            var divRow = $('<div/>', {'class': 'pluginEditor-widgetElem'});
            var remove = makeImageButton("img/close.png", "img/close_orange.png");
            var editButton = makeImageButton("img/edit.png", "img/edit.png");
            $(remove).addClass('pluginEditor-remove');
            $(editButton).addClass('pluginEditor-edit');
            
            remove.onclick = function()
            {
                mapPlugins.remove(name);
            }
            editButton.onclick = function()
            {
                new MapPluginParamsWidget(mapPlugins, name);
            }
            
            divRow.append(remove, editButton, $('<span/>').text(name));
            
            container.append(divRow);
        });
    }
    
    $(mapPlugins).change(update);
    update();
}

var createPluginsEditor = function(container, mapPlugins)
{
    //var mapPlugins = _mapHelper.mapPlugins;
        
    var widgetContainer = $('<div/>', {'class': 'pluginEditor-widgetContainer'});
    var allPluginsContainer = $('<div/>', {'class': 'pluginEditor-allContainer'});
    var mapPluginsWidget = new MapPluginsWidget(widgetContainer, mapPlugins);
    var allPluginsWidget = new GeomixerPluginsWidget(allPluginsContainer, mapPlugins);
    
    $(container)
        .append($('<table/>', {'class': 'pluginEditor-table'}).append($('<tr/>')
            .append($('<td/>', {'class': 'pluginEditor-allTD'}).append(allPluginsContainer))
            .append($('<td/>', {'class': 'pluginEditor-widgetTD'}).append(widgetContainer))
        ));
    
    return {
        update: function() {
            for (var name in paramsWidgets) {
                paramsWidgets[name].update();
            }
        },
        closeParamsDialogs: function() {
            for (var name in paramsWidgets) {
                paramsWidgets[name].closeDialog();
            }
        }
    };
}

gmxCore.addModule('PluginsEditor', {
    createPluginsEditor: createPluginsEditor,
    MapPlugins: MapPlugins
})

nsGmx.createPluginsEditor = createPluginsEditor;
_mapHelper.mapPlugins = new MapPlugins();

//Cтарая версия информации о плагинах карты. Поддерживается для обратной совместимости (например, загрузка доп. карт)
//Формат: {String[]} массив имён плагинов
nsGmx.userObjectsManager.addDataCollector('mapPlugins', {
    load: function(data)
    {
        if (data) {
            _mapHelper.mapPlugins.load(data, 1);
            _mapHelper.mapPlugins.updateGeomixerPlugins();
        }
    },
    collect: function() {
        return _mapHelper.mapPlugins.save(1);
    }
})

//Вторая версия информации о плагинах карты.
//Формат: [{name: pluginName1, params: {param: value, ...}}, ...]
nsGmx.userObjectsManager.addDataCollector('mapPlugins_v2', {
    load: function(data)
    {
        if (data) {
            _mapHelper.mapPlugins.load(data, 2);
            _mapHelper.mapPlugins.updateGeomixerPlugins();
        }
    },
    collect: function()
    {
        return _mapHelper.mapPlugins.save(2);
    }
})

//Третья версия информации о плагинах карты.
//Формат: {plugins: [name1, ....], params: {name1: {param1: value1, ...}, ...}}
nsGmx.userObjectsManager.addDataCollector('mapPlugins_v3', {
    load: function(data)
    {
        if (data) {
            _mapHelper.mapPlugins.load(data, 3);
            _mapHelper.mapPlugins.updateGeomixerPlugins();
        }
    },
    collect: function()
    {
        return _mapHelper.mapPlugins.save(3);
    }
})

})(jQuery);