﻿(function(){

	_translationsHash.addtext("rus", {
							"RyndaMapplet.Description" : "Сообщения пользователей"
						 });
						 
	_translationsHash.addtext("eng", {
							"RyndaMapplet.Description" : "User messages"
						 });

	var RyndaProvider = function( params )
	{
        var _params = params || {};
		this.getDescription = function() { return _gtxt("RyndaMapplet.Description"); }
		this.getData = function( dateBegin, dateEnd, bbox, onSucceess, onError )
		{
			var timestepFrom = Math.round(dateBegin.valueOf()/1000);
			var timestepTo = Math.round(dateEnd.valueOf()/1000);
            
            var subdomainString = ('subdomain' in _params) ? '&subdomain=' + _params.subdomain : '';
            
			var url = "http://rynda.org/public_api/messages?format=jsonp" + subdomainString + "&date_added_from=" + timestepFrom + "&date_added_to=" + timestepTo;
			
			$.ajax({url: url, dataType: 'jsonp', success: function(data)
			{
				onSucceess(data);
			}});
		}
	};
	
	var RyndaRenderer = function()
	{
		var _container = null;
		
		this.bindData = function(data)
		{
			if (_container)
				_container.remove();
			
			_container = globalFlashMap.addObject();
			
			for (var i = 0; i < data.data.length; i++)
			{
				var obj = _container.addObject({
						type: "POINT", 
						coordinates: [parseFloat(data.data[i].lng), parseFloat(data.data[i].lat)]
					}, 
					{
						title: data.data[i].title,
						text: data.data[i].text,
						url: data.data[i].url,
						dateString: $.datepicker.formatDate('dd.mm.yy', new Date(data.data[i].date_added*1000))
					});
				obj.setStyle({marker: {image: "http://maps.kosmosnimki.ru/images/rynda.png", center: true}});
			}
			
			_container.enableHoverBalloon(function(obj, balloonDiv)
			{
				$(balloonDiv).empty();
				var container = $("<div></div>").css({width: "400px", whiteSpace: 'normal'});
				var titleDiv = $("<b></b>", {className: "RyndaTitle"}).text(obj.properties.title);
				var textDiv = $("<div></div>", {className: "RyndaText"}).html(obj.properties.text);
				
				//maxHeight не работает...
				if ($.browser.msie) textDiv.css({height: "200px"});
				
				var dateDiv = $("<div></div>").text("Дата: " + obj.properties.dateString);
				var urlDiv = $("<div></div>").html("Источник: ").append($("<a></a>", {href: obj.properties.url, target: "_blank"}).html(obj.properties.url));
				$(container).append(titleDiv).append(textDiv).append(dateDiv).append(urlDiv);
				$(balloonDiv).append(container);
				return {};
			}, 
			{
				/*OnClickSwitcher: function(obj)
				{
					var canvas = _div(null, [['dir', 'className', 'RyndaText']]);
					canvas.innerHTML = obj.properties.text;
					showDialog("Информационное сообщение Рынды", canvas, 400, 300);
					return true;
				}*/
			});
		}
		
		this.setVisible = function( isVisible )
		{
			if (_container) _container.setVisible( isVisible );
		}
	};
	
	var addRyndaProvider = function(fireControl, params )
	{
		fireControl.whenInited(function()
		{
			fireControl.addDataProvider( "rynda",
				new RyndaProvider( params ),
				new RyndaRenderer(),
				{ isVisible: params.visible }
			);
		});
	}

	gmxCore.addModule('RyndaMapplet', {
		afterViewer: function(params)
		{
            var _params = $.extend({visible: true}, params);
            
			gmxCore.addModulesCallback(['FireMapplet'], function()
			{
                var mFire = gmxCore.getModule('FireMapplet');
				if (mFire.FireControlCollection.instances.length)
					addRyndaProvider(mFire.FireControlCollection.instances[0], _params)
				else
					$(mFire.FireControlCollection).bind('newInstance', function(){ addRyndaProvider(mFire.FireControlCollection.instances[0], _params) });
			});
		}
	}, 
	{ init: function(module, path)
		{
			var doLoadCss = function()
			{
				path = path || window.gmxJSHost || "";
				$.getCSS(path + "RyndaMapplet.css");
			}
			
			if ('getCSS' in $)
				doLoadCss();
			else
				$.getScript(path + "../jquery/jquery.getCSS.js", doLoadCss);
		}
	});

})();