﻿/** Загручик модулей ГеоМиксера

Позволяет загружать модули из разных файлов. 

Модуль - единица кода, имеющая уникальное имя и зависящая от других модулей и скриптов.

@global

*/

var gmxCore = function() 
{
    var _callbacks = [];
    var _modules = {};
    var _globalNamespace = this;
	var _modulesDefaultHost = "";
	var _modulePathes = {/*#buildinclude<modules_path.txt>*/};
	var _moduleFiles = {/*#buildinclude<module_files.txt>*/};
    
    var getScriptURL = function(scriptName)
	{
		var scripts1 = document.getElementsByTagName("script");
		for (var i = 0; i < scripts1.length; i++)
		{
			var src = scripts1[i].getAttribute("src");
			if (src && (src.indexOf(scriptName) != -1))
				return src;
		}
		return false;
	}
	var getScriptBase = function(scriptName)
	{
		var url = getScriptURL(scriptName);
		return url ? url.substring(0, url.indexOf(scriptName)) : "";
	}
    
    var invokeCallbacks = function()
    {
        for (var k = 0; k < _callbacks.length; k++)
        {
            var isAllModules = true;
            var curModules = _callbacks[k].modules;
			var modules = [];
            for (var m = 0; m < curModules.length; m++)
			{
                if ( !(curModules[m] in _modules) )
                {
                    isAllModules = false;
                    break;
                }
				modules.push(_modules[curModules[m]]);
			}
                
            if (isAllModules)
            {
                var curCallback = _callbacks[k].callback;
                
                //first delete, then callback!
                _callbacks.splice(k, 1);
                k = k - 1;
                curCallback.apply(null, modules);
            }
        }
    }
    
    var lazyLoadLABjs = function(callback)
    {
        if ('$LAB' in window) {
            callback();
            return;
        }
        
        //load LAB.js (snippest from its website)
        (function(g,b,d){var c=b.head||b.getElementsByTagName("head"),D="readyState",E="onreadystatechange",F="DOMContentLoaded",G="addEventListener",H=setTimeout;
        H(function(){if("item"in c){if(!c[0]){H(arguments.callee,25);return}c=c[0]}var a=b.createElement("script"),e=false;a.onload=a[E]=function(){if((a[D]&&a[D]!=="complete"&&a[D]!=="loaded")||e){return false}a.onload=a[E]=null;e=true;callback()};

        a.src = ( getScriptBase('gmxcore.js') || window.gmxJSHost || "" ) + 'LAB.min.js';

        c.insertBefore(a,c.firstChild)},0);if(b[D]==null&&b[G]){b[D]="loading";b[G](F,d=function(){b.removeEventListener(F,d,false);b[D]="complete"},false)}})(this,document);
    }
    
    var cssLoader = null;
    
    //public methods
    return {
    
        /** Добавить новый модуль
        * @memberOf gmxCore
        * @param {String} moduleName уникальное имя модуля
        * @param {Object|Function} moduleObj Тело модуля или ф-ция, возвращающая тело. Аргумент ф-ции - путь к модулю. Будет вызвана после загрузки всех зависимостей.
        * @param {Object} [options] Возможны следующие опции:
        *
        *   * require - {Array of string}. Какие модули должны быть загрежены перед данным
        *   * init - {Function} Ф-ция для инициализации модуля. Сигнатура: function moduleInit(moduleObj, modulePath)->{void|jQuery.Deferred}. Если ф-ция возвращает jQuery Deferred, загрузчик будет ждать его для окончания инициализации.
        *   * css - {Array|String} CSS файлы для загрузки. Пути к CSS указываются относительно файла текущего модуля.
        */
        addModule: function(moduleName, moduleObj, options)
        {
            var requiredModules = (options && 'require' in options) ? options.require : [];
            var initDeferred = null;
            var _this = this;
            
            for (var r = 0; r < requiredModules.length; r++)
                this.loadModule( requiredModules[r] );
                
            this.addModulesCallback( requiredModules, function()
            {
                if (typeof moduleObj === 'function')
                        moduleObj = moduleObj( _modulePathes[moduleName] );
                        
                if (options && 'init' in options)
				{
                    initDeferred = options.init(moduleObj, _modulePathes[moduleName]);
				}
                
                if (options && 'css' in options)
				{
                    var cssFiles = typeof options.css === 'string' ? [options.css] : options.css;
                    var path = _modulePathes[moduleName] || window.gmxJSHost || "";
                    
                    for (var iF = 0; iF < cssFiles.length; iF++)
                        _this.loadCSS(path + cssFiles[iF]);
				}
                
                
                if (initDeferred) {
                    initDeferred.done(function() {
                        _modules[moduleName] = moduleObj;
                        invokeCallbacks();
                    });
                } else {
                    _modules[moduleName] = moduleObj;
                    invokeCallbacks();
                }
            });
        },
        
        /** Загрузить модуль
        * @memberOf gmxCore
        * @param { String } moduleName Имя модуля для загрузки
        * @param { String } [moduleSource] Имя файла, откуда загружать модуль. Если не указан, будет сформирован в виде (defaultHost + moduleName + '.js')
        * @param { Function } [callback] Ф-ция, которая будет вызвана после загрузки и инициализации. В ф-цию первым параметром передаётся тело модуля
        * @return { jQuery.Deferred } Отложенный объект, который будет resolve при загрузке модуля
        */
        loadModule: function(moduleName, moduleSource, callback)
        {
            if (typeof moduleSource === 'function') {
                callback = moduleSource;
                moduleSource = undefined;
            }
            
            var def = $.Deferred();
            this.addModulesCallback([moduleName], function(module)
            {
                callback && callback(module);
                def.resolve(module);
            });
            
            if ( ! (moduleName in _modules) )
            {
                var headElem = document.getElementsByTagName("head")[0];
                var newScript = document.createElement('script');
                
                var path;
                if (typeof moduleSource != 'undefined')
                {
                    path = moduleSource.match(/^http:\/\//i) ? moduleSource : (window.gmxJSHost || "") + moduleSource;
                }
                else
                {
                    path = (moduleName in _moduleFiles) ? _moduleFiles[moduleName] : (_modulesDefaultHost || window.gmxJSHost || "") + moduleName + '.js';
                }

                var pathRegexp = /(.*)\/[^\/]+/;
                if ( typeof _modulePathes[moduleName] === 'undefined' )
                    _modulePathes[moduleName] = pathRegexp.test(path) ? path.match(pathRegexp)[1] + "/" : "";
				
                newScript.type = 'text/javascript';
                newScript.src = path + (window.gmxDropBrowserCache ? "?" + Math.random() : "");
                newScript.charset = "utf-8";
                headElem.appendChild(newScript);
            }
            
            return def;
        },
        
        /** Добавить callback, который будет вызван после загрузки моделей
        *
        * Если модули уже загружены, callback будет вызван сразу же
        *
        * @memberOf gmxCore
        * @param {Array} moduleNames Массив имён модулей
        * @param {Function} callback Ф-ция, которую нужно вызвать после загрузки. В качестве аргументов в ф-цию передаются загруженные модули
        */
        addModulesCallback: function( moduleNames, callback )
        {
            _callbacks.push({modules: moduleNames, callback: callback});
            invokeCallbacks();
        },
        
        /** Получить модуль по имени.
        *
        * @memberOf gmxCore
        * @param {String} moduleName Имя модуля
        * @return {Object} Тело модуля. Если модуль не загружен, вернётся null.
        */
        getModule: function(moduleName)
        {
            return moduleName in _modules ? _modules[moduleName] :  null;
        },
		
        /** Установить дефольный путь к модулям. Используется если указан локальный файл модуля.
        * @memberOf gmxCore
        * @param {String} defaultHost Дефолтный путь у модулям.
        */
		setDefaultModulesHost: function( defaultHost )
		{
			_modulesDefaultHost = defaultHost;
		},
		
        pushModule2GlobalNamespace: function(moduleName)
        {
            if ( ! (moduleName in _modules) ) return;
            var module = _modules[moduleName];
            
            for (var p in module)
                _globalNamespace[p] = module[p];
        },
		
        /** Получить путь к директории, из которой был загружен модуль.
        * @memberOf gmxCore
        * @param {String} moduleName Имя модуля
        * @returns {String} Путь к директории, из которой был загружен модуль. Для не загруженных модулей ничего не возвращает
        */
		getModulePath: function(moduleName)
		{
			return _modulePathes[moduleName];
		},
        
        /** Возвращает ф-цию, которая делает следующее:
        *
        *  - Если модуль moduleName не загружен, загружает его
        *  - Потом просто вызывает ф-цию с именем functionName из этого модуля, передав ей все свои параметры
        *
        * @memberOf gmxCore
        * @param {String} moduleName Имя модуля
        * @param {String} functionName Название ф-ции внутри модуля
        * @param {Function} callback Ф-ция, которая будет вызвана после того, как отработает ф-ция модуля. В callback будет передан ответ ф-ции.
        */
        createDeferredFunction: function(moduleName, functionName, callback)
        {
            var _this = this;
            return function()
            {
                var args = arguments;
                _this.loadModule(moduleName);
                _this.addModulesCallback([moduleName], function(module)
                {
                    var res = module[functionName].apply(this, args);
                    callback && callback(res);
                });
            }
        },
        
        /** Загружает скрипт после предвариетельной проверки условий.
        *
        * @memberOf gmxCore
        * @param {Array} filesInfo Массив объектов со следующими свойствами:
        *
        *   * check: function() -> Bool. Если возвращает true, ни js ни css не будет загружены
        *   * script: String. Не обязательно. Скрипт для загрузки, если провалится проверка
        *   * css: String. Не обязательно. CSS файл для загрузки, если провалится проверка
        *   @returns jQuery Deferred, который будет разрешён когда все скрипты выполнятся (окончание загрузки css не отслеживается)
        */
        loadScriptWithCheck: function(filesInfo)
        {
            var _this = this;
            var localFilesInfo = filesInfo.slice(0);
            var def = $.Deferred();
            
            var doLoad = function(info)
            {
                if (localFilesInfo.length > 0)
                {
                    var curInfo = localFilesInfo.shift();
                    if (curInfo.check())
                        doLoad()
                    else
                    {
                        curInfo.css && _this.loadCSS(curInfo.css);
                        
                        if (curInfo.script)
                            _this.loadScript(curInfo.script).then(doLoad);
                        else
                            doLoad();
                    }
                }
                else
                    def.resolve();
            }
            
            doLoad();
            return def.promise();
        },
        
        /**
        * Загружает отдельный скрипт
        * @memberOf gmxCore
        * @param {String} fileName Имя файла скрипта
        * @param {String} [callback] Ф-цию, которая будет вызвана после загрузки
        * @returns {jQuery.Deferred}
        */
        loadScript: function(fileName, callback)
        {
            var def = $.Deferred();
            lazyLoadLABjs(function()
            {
                $LAB.script(fileName).wait(function()
                {
                    def.resolve();
                    callback && callback();
                })
            })
            return def.promise();
        }, 
        
        /** Загрузить отдельный css файл
        * @memberOf gmxCore
        * @param {String} cssFilename Имя css файла.
        */
        loadCSS: function(cssFilename)
        {
            var doLoadCss = function()
            {
                $.getCSS(cssFilename);
            }
            
            if ('getCSS' in $)
            {
                doLoadCss()
            }
            else
            {
                if (!cssLoader)
                {
                    var path = getScriptBase('gmxcore.js') || window.gmxJSHost || "";
                    cssLoader = $.getScript(path + "jquery/jquery.getCSS.js");
                }
                
                cssLoader.done(doLoadCss);
            }
        }
    }
}();