//Контроллёр контектных меню и соответствующие пункты всех меню...

var nsGmx = nsGmx || {};

/** 
* Контроллёр контекстных меню.
* @memberOf nsGmx
* @class Позволяет добавлять элементы контектсного меню разного типа и привязывать меню к отдельным DOM элементам. 
* Возможно динамическое создание меню при клике на объекте. Элементам меню передаётся контекст, 
* указанный при привязке меню к элементу (он так же может создаваться в момент клика на элементе)
*
* Каждый элемент меню - отдельный объект, они независимо добавляются в контроллер. 
* При создании меню определённого типа из этого набора выбираются нужные элементы.
*/
nsGmx.ContextMenuController = (function()
{
	var _menuItems = {};
	var SUGGEST_TIMEOUT = 700;
	
	// Показывает контектное меню для конкретного элемента. 
	// В Opera меню показывается при наведении на элемент в течении некоторого времени, во всех остальных браузерах - по правому клику.
	// Меню исчезает при потере фокуса
	// Параметры:
	// * elem {DOMElement} - элемент, на который навешивается меню
	// * menuFunc {Function, menuFunc()->DomElement} - функция, создающая меню
	// * checkFunc {Function, checkFunc()->Bool} - если возвращает false, то ничего не показывается...
	// * suggestTimeout {float} - задержка в мс перед показом меню в Opera
	var _context = function(elem, menuFunc, checkFunc, suggestTimeout)
	{
		var menu = null;
		if (jQuery.browser.opera)
		{
			elem.onmouseover = function()
			{
                if ($('#contextMenuCanvas', elem).length > 0) return;
				if (typeof checkFunc !== 'undefined' && !checkFunc())
					return;
				
				this.timer = setTimeout(function()
				{
					elem.timer = null;
					
                    var menu = menuFunc();
                    if (!menu) return;
                    var contextMenu = _div([menu],[['dir','className','contextMenu'], ['attr','id','contextMenuCanvas']]);
                    _(elem, [contextMenu]);
					
					elem.style.backgroundColor = '#DAEAF3';
					contextMenu.style.top = elem.offsetHeight + 'px';
					contextMenu.style.left = "0px";
					
                    //после появления меню ему нужно заново выставить позицию, так как в Opera почему-то изменяется размеры
					jQuery(contextMenu).fadeIn(500, function()
                    {
                        contextMenu.style.top = elem.offsetHeight + 'px';
                    });
					
				}, suggestTimeout)
			}
			
			elem.onmouseout = function(e)
			{
				if (typeof checkFunc !== 'undefined' && !checkFunc())
					return;
				
				if (this.timer)
					clearTimeout(this.timer);

				var evt = e || window.event,
					target = evt.srcElement || evt.target,
					relTarget = evt.relatedTarget || evt.toElement;
				
				while (relTarget)
				{
					if (relTarget == elem)
						return;
					relTarget = relTarget.parentNode;
				}
				
				elem.style.backgroundColor = '';

                $("#contextMenuCanvas", elem).fadeOut(500, function()
                {
                    $("#contextMenuCanvas", elem).remove();
                });
			}
		}
		else
		{
			elem.oncontextmenu = function(e)
			{
				if (typeof checkFunc != 'undefined' && !checkFunc())
					return false;
					
				menu = menu || menuFunc();
				if (!menu) return false;
				
				var contextMenu = _div([menu],[['dir','className','contextMenu'], ['attr','id','contextMenuCanvas']])
				
				var evt = e || window.event;
				
				hidden(contextMenu);
				_(document.body, [contextMenu])
				
				// определение координат курсора для ie
				if (evt.pageX == null && evt.clientX != null )
				{
					var html = document.documentElement
					var body = document.body
					
					evt.pageX = evt.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0)
					evt.pageY = evt.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0)
				}
				
				if (evt.pageX + contextMenu.clientWidth < getWindowWidth())
					contextMenu.style.left = evt.pageX - 5 + 'px';
				else
					contextMenu.style.left = evt.pageX - contextMenu.clientWidth + 5 + 'px';
				
				if (evt.pageY + contextMenu.clientHeight < getWindowHeight())
					contextMenu.style.top = evt.pageY - 5 + 'px';
				else
					contextMenu.style.top = evt.pageY - contextMenu.clientHeight + 5 + 'px';
				
				visible(contextMenu)
				
				var menuArea = contextMenu.getBoundingClientRect();
				
				contextMenu.onmouseout = function(e)
				{
					var evt = e || window.event;
					
					// определение координат курсора для ie
					if (evt.pageX == null && evt.clientX != null )
					{
						var html = document.documentElement
						var body = document.body
						
						evt.pageX = evt.clientX + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0)
						evt.pageY = evt.clientY + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0)
					}
					
					if (evt.pageX <= menuArea.left || evt.pageX >= menuArea.right ||
						evt.clientY <= menuArea.top || evt.clientY >= menuArea.bottom)
						contextMenu.removeNode(true)
				}
				
				return false;
			}
		}
	}	
	
	var _contextClose = function()
	{
		if ($$('contextMenuCanvas'))
			$$('contextMenuCanvas').removeNode(true)
	}	
	
	var _generateMenuDiv = function(type, context)
	{
		var bAnyElem = false;
		var actionsCanvas = _div();
		var items = _menuItems[type];
		
		for (var e = 0; e < items.length; e++)
			(function (menuElem) {
				if (typeof menuElem.isVisible !== 'undefined' && !menuElem.isVisible(context) ) return;
				
				bAnyElem = true;
				
				var titleLink = makeLinkButton(menuElem.title);
				titleLink.onclick = function()
				{
					context.contentMenuArea = getOffsetRect(this);
					context.contextMenuType = type;
					_contextClose();
					$(this).removeClass('buttonLinkHover');
					menuElem.clickCallback(context);
				};
				
				if ( typeof menuElem.isSeparatorBefore !== 'undefined' && menuElem.isSeparatorBefore(context) )
					_(actionsCanvas, [_div(null, [['dir','className','contextMenuItem contextMenuSeparator']])]);
				
				_(actionsCanvas, [_div([titleLink],[['dir','className','contextMenuItem']])]);
				
			})(items[e]);

		return bAnyElem ? actionsCanvas : null;
	}
	
	//public interface
	return {
	
		/**
		 * Добавляет новый пункт меню
		 * @function
		 * @param {nsGmx.ContextMenuController.IContextMenuElem} menuItem Элемент контекстного меню
		 * @param {String || Array} menuType Тип меню (например: "Layer", "Map", "Group"). Если массив, то данный элемент применяется в нескольких типах меню
		 */
		addContextMenuElem: function(menuItem, menuType)
		{
			if (typeof menuType === 'string')
				menuType = [menuType];
				
			for (var i = 0; i < menuType.length; i++)
			{
				_menuItems[menuType[i]] = _menuItems[menuType[i]] || [];
				_menuItems[menuType[i]].push(menuItem);
			}
		},
		
		/**
		 * Добавляет к DOM элементу контекстное меню
		 * @function
		 * @param {DOMElement} elem Целевой DOM-элемент
		 * @param {string} type Тип меню
		 * @param {Function, checkFunc()->Bool} checkFunc Проверка, показывать ли сейчас меню. Если ф-ция возвращает false, меню не показывается
		 * @param {object || Function, context()->object} context Контекст, который будет передан в элемент меню при клике на DOM-элементе. 
		 *        Если контект - ф-ция, она будет вызвана непосредственно при клике. В контекст при клике будут добавлены элементы contentMenuArea и contextMenuType.
		 */
		bindMenuToElem: function(elem, type, checkFunc, context)
		{
			if (typeof _menuItems[type] === 'undefined') return;
			
			_context(elem, function()
			{
				if (typeof context === 'function')
					context = context(); //
					
				return _generateMenuDiv(type, context);
			}, checkFunc, SUGGEST_TIMEOUT)
		}
	}
})();

/** Интерфейс для задания контекстного меню пользователей
* @class
* @memberOf nsGmx
*/
nsGmx.ContextMenuController.IContextMenuElem = {

	/** Нужно ли отображать данный пункт меню для данного элемента и типа дерева. Необязательная (по умолчанию отображается)
	@function
	@param context {object} - контекст, специфический для конкретного типа меню
	*/
	isVisible:         function(context){},
	
	/** Нужно ли рисовать перед данным пунктом разделитель (гориз. черту). Необязательная (по умолчанию не рисуется)
	@function
	@param context {object} - контекст, специфический для конкретного типа меню
	*/
	isSeparatorBefore: function(context){},
	
	/** Вызывается при клике по соответствующему пункту меню
	@function
	@param context {object} - контекст, который был передан при привязке меню к DOM-элементу. 
	       В контекст будут добавлены поля
		     * contentMenuArea {object} - координаты верхнего левого угла пункта меню, на которое было нажатие. {left: int, top: int}. Если нужно привязаться к месту текущего клика
			 * contentMenuType {string}- тип вызванного контекстного меню. Актуально, если элемент меню используется в нескольких типах меню.
	*/
	clickCallback:     function(context){},
	
	/** Строка, которую нужно отображать в контекстном меню
	*/
	title: ""
}

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// Контекстное меню слоёв ////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/*
В контексте типа "Layer" присутствуют следующие атрибуты:
 * LayerManagerFlag {int} Тип дерева
 * elem Элемент (слой), для которого стротся меню
 * tree {layersTree} Текущее дерево, внутри которого находится слой
*/

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Редактировать"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && _queryMapLayers.currentMapRights() === "edit";
	},
	clickCallback: function(context)
	{
		var div;
		if (context.elem.LayerID)
			div = $(_queryMapLayers.buildedTree).find("div[LayerID='" + context.elem.LayerID + "']")[0];
		else
			div = $(_queryMapLayers.buildedTree).find("div[MultiLayerID='" + context.elem.MultiLayerID + "']")[0];
		_mapHelper.createLayerEditor(div, 0, div.properties.content.properties.styles.length > 1 ? -1 : 0);
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Таблица атрибутов"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && _queryMapLayers.currentMapRights() === "edit" && context.elem.type === "Vector";
	},
	clickCallback: function(context)
	{
		_attrsTableHash.create(context.elem.name);
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Права доступа"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && 
				_queryMapLayers.currentMapRights() === "edit" && 
				nsGmx.AuthManager.canDoAction(nsGmx.ACTION_SEE_MAP_RIGHTS ) && 
				( _mapHelper.mapProperties.Owner == nsGmx.AuthManager.getUserName() || nsGmx.AuthManager.isRole(nsGmx.ROLE_ADMIN) );
	},
	clickCallback: function(context)
	{
		if (context.elem.LayerID)
			_layerSecurity.getRights(context.elem.LayerID, context.elem.title);
		else if (context.elem.MultiLayerID)
			_multiLayerSecurity.getRights(context.elem.MultiLayerID, context.elem.title);
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Скачать"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && 
				( _queryMapLayers.currentMapRights() === "edit" || (_queryMapLayers.currentMapRights() == "view" && nsGmx.AuthManager.isLogin() ) ) && 
				context.elem.type == "Vector" &&
				_mapHelper.mapProperties.CanDownloadVectors;
	},
	clickCallback: function(context)
	{
		_layersTree.downloadVectorLayer(context.elem.name, context.contentMenuArea, context.elem.hostName);
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Удалить"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && _queryMapLayers.currentMapRights() === "edit";
	},
	clickCallback: function(context)
	{
		_queryMapLayers.removeLayer(context.elem.name)
		
		var div;
			
		if (context.elem.LayerID)
			div = $(_queryMapLayers.buildedTree).find("div[LayerID='" + context.elem.LayerID + "']")[0];
		else
			div = $(_queryMapLayers.buildedTree).find("div[MultiLayerID='" + context.elem.MultiLayerID + "']")[0];
		
		var treeElem = _mapHelper.findTreeElem(div).elem,
			node = div.parentNode,
			parentTree = node.parentNode;
		
		_mapHelper.removeTreeElem(div);

		node.removeNode(true);
		
		_abstractTree.delNode(null, parentTree, parentTree.parentNode);
		
		_mapHelper.updateUnloadEvent(true);
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Копировать стиль"),
	isVisible: function(context)
	{
		return context.elem.type == "Vector" && 
		       (context.layerManagerFlag || _queryMapLayers.currentMapRights() === "edit");
	},
	isSeparatorBefore: function(context)
	{
		return !context.layerManagerFlag;
	},
	clickCallback: function(context)
	{
		var div;
		if (context.elem.LayerID)
			div = $(_queryMapLayers.buildedTree).find("div[LayerID='" + context.elem.LayerID + "']")[0];
		else
			div = $(_queryMapLayers.buildedTree).find("div[MultiLayerID='" + context.elem.MultiLayerID + "']")[0];
			
		context.tree.copiedStyle = {type: context.elem.GeometryType, style: div.properties.content.properties.styles};
	}
}, 'Layer');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Применить стиль"),
	isVisible: function(context)
	{
		return !context.layerManagerFlag && 
				_queryMapLayers.currentMapRights() === "edit" && 
				context.elem.type == "Vector";
	},
	clickCallback: function(context)
	{
		if (!context.tree.copiedStyle)
		{
			showErrorMessage(_gtxt("Не выбран стиль"), true)
			
			return;
		}
		
		if (context.tree.copiedStyle.type != context.elem.GeometryType)
		{
			showErrorMessage(_gtxt("Невозможно применить стиль к другому типу геометрии"), true)
			
			return;
		}
		
		var newStyles = context.tree.copiedStyle.style;
		var div;
		
		if (context.elem.LayerID)
			div = $(_queryMapLayers.buildedTree).find("div[LayerID='" + context.elem.LayerID + "']")[0];
		else
			div = $(_queryMapLayers.buildedTree).find("div[MultiLayerID='" + context.elem.MultiLayerID + "']")[0];
		
		div.properties.content.properties.styles = newStyles;
		
		_mapHelper.updateMapStyles(newStyles, context.elem.name);
		
		_mapHelper.updateTreeStyles(newStyles, div);
	}
}, 'Layer');

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// Контекстное меню групп ////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/*
В контексте типа "Group" присутствуют следующие атрибуты:
 * div {DOMElement} Элемент дерева, для которого стротся меню
 * tree {layersTree} Текущее дерево карты
*/

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Редактировать"),
	clickCallback: function(context)
	{
		context.tree.mapHelper.createGroupEditor(context.div);
	}
}, 'Group');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Добавить подгруппу"),
	clickCallback: function(context)
	{
		context.tree.addSubGroup(context.div);
	}
}, 'Group');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Удалить"),
	clickCallback: function(context)
	{
		context.tree.removeGroup(context.div);
		context.tree.mapHelper.updateUnloadEvent(true);
	}
}, 'Group');
///////////////////////////////////////////////////////////////////////////////
/////////////////////////// Контекстное меню карты ////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/*
В контексте типа "Map" присутствуют следующие атрибуты:
 * div {DOMElement} Элемент дерева, для которого стротся меню
 * tree {layersTree} Текущее дерево карты
*/
nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Редактировать"),
	clickCallback: function(context)
	{
		context.tree.mapHelper.createMapEditor(context.div);
	}
}, 'Map');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Добавить подгруппу"),
	clickCallback: function(context)
	{
		context.tree.addSubGroup(context.div);
	}
}, 'Map');

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Права доступа"),
	clickCallback: function(context)
	{
		_mapSecurity.getRights(context.tree.mapHelper.mapProperties.MapID, context.tree.mapHelper.mapProperties.title);
	},
	isVisible: function(context)
	{
		return nsGmx.AuthManager.canDoAction(nsGmx.ACTION_SEE_MAP_RIGHTS ) && 
		 ( (context.tree.mapHelper.mapProperties.Owner == nsGmx.AuthManager.getUserName()) || 
		   nsGmx.AuthManager.isRole(nsGmx.ROLE_ADMIN) );
	}
}, 'Map');

///////////////////////////////////////////////////////////////////////////////
////////////////////////// Контекстное меню браузера //////////////////////////
///////////////////////////////////////////////////////////////////////////////

(function(){

//фабрика, которая может возвращать элементы меню для архивирования (isZip=true) и разархивирования (isZip=false)
var zipUnzipActionFactory = function(isZip)
{
	return {
		title: isZip ? _gtxt("Упаковать") : _gtxt("Извлечь"),
		clickCallback: function(context)
		{
			sendCrossDomainJSONRequest(serverBase + (context.enableUnzip ? 'FileBrowser/Unzip.ashx' : 'FileBrowser/Zip.ashx') + '?WrapStyle=func&FullName=' + context.fullPath, function(response)
			{
				if (!parseResponse(response))
					return;
				
				var indexSlash = String(response.Result).lastIndexOf('\\'),
					fileName = String(response.Result).substring(indexSlash + 1, response.Result.length);
				
				context.fileBrowser.shownPath = fileName;
				
				context.fileBrowser.getFiles();
			})
		},
		isVisible: function(context)
		{
			return isZip ? !context.enableUnzip : context.enableUnzip; //XOR
		}
	}
}

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Скачать"),
	clickCallback: function(context)
	{
		var form = _form([_input(null,[['attr','name','FullName'], ['attr','value', context.fullPath]])], [['css','display','none'],['attr','method','POST'],['attr','action',serverBase + "FileBrowser/Download.ashx"]]);
		
		_(document.body, [form]);
		
		form.submit();
		
		form.removeNode(true);
	}
}, ['FileBrowserFolder', 'FileBrowserFile']);

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Удалить"),
	clickCallback: function(context)
	{
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/Delete.ashx?WrapStyle=func&FullName=' + context.fullPath, function(response)
		{
			if (!parseResponse(response))
				return;
			
			context.fileBrowser.getFiles();
		})
	}
}, ['FileBrowserFolder', 'FileBrowserFile']);

nsGmx.ContextMenuController.addContextMenuElem({
	title: _gtxt("Очистить"),
	clickCallback: function(context)
	{
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/CleanFolder.ashx?WrapStyle=func&FullName=' + context.fullPath, function(response)
		{
			if (!parseResponse(response))
				return;
			
			context.fileBrowser.getFiles();
		})	
	}
}, 'FileBrowserFolder');

//упаковываем и файлы и папки
nsGmx.ContextMenuController.addContextMenuElem(zipUnzipActionFactory(true), ['FileBrowserFolder', 'FileBrowserFile']);

//распаковываем только файлы
nsGmx.ContextMenuController.addContextMenuElem(zipUnzipActionFactory(false), 'FileBrowserFile');

})();