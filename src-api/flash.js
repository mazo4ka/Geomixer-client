//��������� Flash
(function()
{
	// �������� ������� � SWF
	function FlashCMD(cmd, hash)
	{
		var ret = {};
		if(!gmxAPI.flashDiv) return ret;
//var startTime = (new Date()).getTime();
		var flashDomTest = typeof(gmxAPI.flashDiv); 
		var obj = hash['obj'] || null;	// ������� ������ �������
		var attr = hash['attr'] || '';
		switch (cmd) {				// ��� �������
			case 'setVisible':		// �������� ��������� �������
				if(obj) {
					gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'flag':attr } );
					if (attr && obj.backgroundColor)
						gmxAPI.map.setBackgroundColor(obj.backgroundColor);
					if (obj.copyright)
						gmxAPI.map.updateCopyright();
					var func = gmxAPI.map.onSetVisible[obj.objectId];
					if (func)
						func(attr);
				}
				break;
			case 'sendPNG':			// ���������� ����������� ����� �� ������
				var miniMapFlag = map.miniMap.getVisibility();
				var flag = (attr.miniMapSetVisible ? true : false);
				map.miniMap.setVisible(flag);
				if(attr.func) attr.func = uniqueGlobalName(attr.func);
				ret['base64'] = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				map.miniMap.setVisible(miniMapFlag);
				break;
			case 'setZoomBounds':	// ���������� ����������� �� Zoom
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'minZ':attr['minZ'], 'maxZ':attr['maxZ'] });
				break;
			case 'setClusters':		// ���������� ������������� ��������
				if(attr && 'newProperties' in attr) {
					var keyArray = [];
					var valArray = [];
					for(key in attr['newProperties'])
					{
						keyArray.push(key);
						valArray.push(attr['newProperties'][key]);
					}
					attr['propFields'] = [keyArray, valArray];
					attr['hideFixedBalloons'] = uniqueGlobalName(function() { gmxAPI.map.balloonClassObject.hideHoverBalloons(true); });
				}
				var flag = ('clusters' in obj);	// ��������� ���������
				if(!flag)
					obj['clusters'] = new Clusters(obj);
				else
					ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr });
				attr['visible'] = flag;
				obj['clusters']['attr'] = attr;

				if(!obj.parent._hoverBalloonAttr) obj.parent.enableHoverBalloon();	// ���� ������� �� �����������
				break;
			case 'delClusters':		// ������� ������������� ��������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId });
				if('clusters' in obj) obj['clusters']['attr']['visible'] = false;
				break;
			case 'setGridVisible':		// �������� ��������� �����
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'flag':attr } );
				break;
			case 'getGridVisibility':	// �������� ��������� �����
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { } );
				break;
			case 'getZoomBounds':	// �������� ����������� �� Zoom
			case 'getDepth':		// �������� ������ �������
			case 'getVisibility':	// �������� ���������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId });
				break;
			case 'savePNG':			// ��������� PNG ���� ������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'fileName':attr });
				break;
			case 'trace':			// ��������� � SWF
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'data':attr });
				break;
			case 'setQuality':		// ��������� Quality
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'data':attr });
				break;
			case 'disableCaching':	// ????
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'print':			// ������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'repaint':			// ????
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'addContextMenuItem':	// �������� ����� � ����������� ���� SWF
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'moveTo':			//������������� ����� �� ����������� ������ � �������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'slideTo':			//������ ������������� ����� �� ����������� ������ � �������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'zoomBy':			//�������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'freeze':			// ����������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'unfreeze':		// �����������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'setCursor':		//��������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'clearCursor':		//������ ������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'setCursorVisible'://��������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'stopDragging':	//������ ���� Drag
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'isDragging':		//�������� ���� Drag
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'resumeDragging':	//����������� Drag
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'getPosition':		//�������� ������� �������� SWF
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'getX':			//�������� ������� � ������ SWF
				ret = gmxAPI.from_merc_x(gmxAPI.flashDiv.cmdFromJS(cmd, { }));
				break;
			case 'getY':			//�������� ������� Y ������ SWF
				ret = gmxAPI.from_merc_y(gmxAPI.flashDiv.cmdFromJS(cmd, { }));
				break;
			case 'getZ':			//�������� ������� Z
				ret = 17 - gmxAPI.flashDiv.cmdFromJS(cmd, { });
				break;
			case 'getMouseX':		//�������� ������� � MouseX
				ret = gmxAPI.from_merc_x(gmxAPI.flashDiv.cmdFromJS(cmd, { }));
				break;
			case 'getMouseY':		//�������� ������� Y MouseY
				ret = gmxAPI.from_merc_y(gmxAPI.flashDiv.cmdFromJS(cmd, { }));
				break;
			case 'isKeyDown':		//��������� ������� ������� � SWF
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'setExtent':		//���������� Extent � SWF
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'setMinMaxZoom':	//���������� Zoom �����������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'addMapWindow':	//�������� ���� �����
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'setStyle':		// ���������� Style �������
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'getStyle':		//�������� Style �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'removeDefaults':attr });
				break;
			case 'positionWindow':	// 
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'setBackgroundColor':	// 
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'color':attr } );
				break;
			case 'getChildren':		// �������� ������ ��������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'setHandler':		// ��������� ����������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'eventName':attr['eventName'], 'callbackName':attr['callbackName'] } );
				break;
			case 'removeHandler':	// �������� ����������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'eventName':attr['eventName'] } );
				break;
			case 'addObject':		// �������� ������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'geometry':attr['geometry'], 'properties':attr['properties'] } );
				break;
			case 'addObjects':		// �������� �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, attr);
				break;
			case 'addObjectsFromSWF':	// �������� ������� �� SWF �����
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'attr':attr });
				break;
			case 'setFilter':		// �������� ������ � �������
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'sql':attr['sql'] } );
				break;
			case 'remove':			// ������� ������
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'bringToTop':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'bringToDepth':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'zIndex':attr['zIndex'] } );
				break;
			case 'bringToBottom':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'setActive':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'flag':attr['flag'] } );
				break;
			case 'setEditable':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'startDrawing':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'type':attr['type'] } );
				break;
			case 'stopDrawing':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'isDrawing':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getIntermediateLength':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getCurrentEdgeLength':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'setLabel':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'label':attr['label'] } );
				break;
			case 'setBackgroundTiles':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'minZoomView':attr['minZoomView'], 'maxZoomView':attr['maxZoomView'], 'minZoom':attr['minZoom'], 'maxZoom':attr['maxZoom'], 'func':attr['func'], 'projectionCode':attr['projectionCode'] } );
				break;
			case 'setDisplacement':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'dx':attr['dx'], 'dy':attr['dy'] } );
				break;
			case 'setTileCaching':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'flag':attr['flag'] } );
				break;
			case 'setImageExtent':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'clearBackgroundImage':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'setGeometry':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'getGeometry':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getLength':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getArea':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getGeometryType':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getCenter':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'addChildRoot':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'setVectorTiles':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'tileFunction':attr['tileFunction'], 'identityField':attr['cacheFieldName'], 'tiles':attr['dataTiles'], 'filesHash':attr['filesHash'] } );
				break;
			case 'setTiles':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'tiles':attr['tiles'], 'flag':attr['flag'] } );
				break;
			case 'startLoadTiles':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;

			case 'getStat':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'observeVectorLayer':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'layerId':attr['layerId'], 'func':attr['func'] } );
				break;
			case 'setImage':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'url':attr['url'],
				'x1':attr['x1'], 'y1':attr['y1'], 'x2':attr['x2'], 'y2':attr['y2'], 'x3':attr['x3'], 'y3':attr['y3'], 'x4':attr['x4'], 'y4':attr['y4'],
				'tx1':attr['tx1'], 'ty1':attr['ty1'], 'tx2':attr['tx2'], 'ty2':attr['ty2'], 'tx3':attr['tx3'], 'ty3':attr['ty3'], 'tx4':attr['tx4'], 'ty4':attr['ty4']
				} );
				break;
			case 'flip':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId } );
				break;
			case 'getFeatureById':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'fid':attr['fid'], 'func':attr['func'] } );
				break;
			case 'getFeatures':
				gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'geom':attr['geom'], 'func':attr['func'] } );
				break;
			case 'getTileItem':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'vId':attr } );
				break;
			case 'setTileItem':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr['data'], 'flag':attr['flag'] } );
				break;
			case 'getItemsFromExtent':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'setFlashLSO':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
			case 'setAPIProperties':
				ret = gmxAPI.flashDiv.cmdFromJS(cmd, { 'objectId':obj.objectId, 'data':attr } );
				break;
		}
/*
if(!window._debugTimes) window._debugTimes = { 'jsToFlash': { 'timeSum':0, 'callCount':0, 'callFunc':{} } };
var delta = (new Date()).getTime() - startTime;
window._debugTimes.jsToFlash.timeSum += delta;
window._debugTimes.jsToFlash.callCount += 1;
if(!window._debugTimes.jsToFlash.callFunc[cmd]) window._debugTimes.jsToFlash.callFunc[cmd] = { 'timeSum':0, 'callCount':0 };
window._debugTimes.jsToFlash.callFunc[cmd]['timeSum'] += delta;
window._debugTimes.jsToFlash.callFunc[cmd]['callCount'] += 1;
*/
		return ret;
	}
	
	if(typeof deconcept=="undefined"){var deconcept=new Object();}if(typeof deconcept.util=="undefined"){deconcept.util=new Object();}if(typeof deconcept.SWFObjectUtil=="undefined"){deconcept.SWFObjectUtil=new Object();}deconcept.SWFObject=function(_1,id,w,h,_5,c,_7,_8,_9,_a){if(!document.getElementById){return;}this.DETECT_KEY=_a?_a:"detectflash";this.skipDetect=deconcept.util.getRequestParameter(this.DETECT_KEY);this.params=new Object();this.variables=new Object();this.attributes=new Array();if(_1){this.setAttribute("swf",_1);}if(id){this.setAttribute("id",id);}if(w){this.setAttribute("width",w);}if(h){this.setAttribute("height",h);}if(_5){this.setAttribute("version",new deconcept.PlayerVersion(_5.toString().split(".")));}this.installedVer=deconcept.SWFObjectUtil.getPlayerVersion();if(!window.opera&&document.all&&this.installedVer.major>7){deconcept.SWFObject.doPrepUnload=true;}if(c){this.addParam("bgcolor",c);}var q=_7?_7:"high";this.addParam("quality",q);this.setAttribute("useExpressInstall",false);this.setAttribute("doExpressInstall",false);var _c=(_8)?_8:window.location;this.setAttribute("xiRedirectUrl",_c);this.setAttribute("redirectUrl","");if(_9){this.setAttribute("redirectUrl",_9);}};deconcept.SWFObject.prototype={useExpressInstall:function(_d){this.xiSWFPath=!_d?"expressinstall.swf":_d;this.setAttribute("useExpressInstall",true);},setAttribute:function(_e,_f){this.attributes[_e]=_f;},getAttribute:function(_10){return this.attributes[_10];},addParam:function(_11,_12){this.params[_11]=_12;},getParams:function(){return this.params;},addVariable:function(_13,_14){this.variables[_13]=_14;},getVariable:function(_15){return this.variables[_15];},getVariables:function(){return this.variables;},getVariablePairs:function(){var _16=new Array();var key;var _18=this.getVariables();for(key in _18){_16[_16.length]=key+"="+_18[key];}return _16;},getSWFHTML:function(){var _19="";if(navigator.plugins&&navigator.mimeTypes&&navigator.mimeTypes.length){if(this.getAttribute("doExpressInstall")){this.addVariable("MMplayerType","PlugIn");this.setAttribute("swf",this.xiSWFPath);}_19="<embed type=\"application/x-shockwave-flash\" src=\""+this.getAttribute("swf")+"\" width=\""+this.getAttribute("width")+"\" height=\""+this.getAttribute("height")+"\" style=\""+this.getAttribute("style")+"\"";_19+=" id=\""+this.getAttribute("id")+"\" name=\""+this.getAttribute("id")+"\" ";var _1a=this.getParams();for(var key in _1a){_19+=[key]+"=\""+_1a[key]+"\" ";}var _1c=this.getVariablePairs().join("&");if(_1c.length>0){_19+="flashvars=\""+_1c+"\"";}_19+="/>";}else{if(this.getAttribute("doExpressInstall")){this.addVariable("MMplayerType","ActiveX");this.setAttribute("swf",this.xiSWFPath);}_19="<object id=\""+this.getAttribute("id")+"\" classid=\"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000\" width=\""+this.getAttribute("width")+"\" height=\""+this.getAttribute("height")+"\" style=\""+this.getAttribute("style")+"\">";_19+="<param name=\"movie\" value=\""+this.getAttribute("swf")+"\" />";var _1d=this.getParams();for(var key in _1d){_19+="<param name=\""+key+"\" value=\""+_1d[key]+"\" />";}var _1f=this.getVariablePairs().join("&");if(_1f.length>0){_19+="<param name=\"flashvars\" value=\""+_1f+"\" />";}_19+="</object>";}return _19;},write:function(_20){if(this.getAttribute("useExpressInstall")){var _21=new deconcept.PlayerVersion([6,0,65]);if(this.installedVer.versionIsValid(_21)&&!this.installedVer.versionIsValid(this.getAttribute("version"))){this.setAttribute("doExpressInstall",true);this.addVariable("MMredirectURL",escape(this.getAttribute("xiRedirectUrl")));document.title=document.title.slice(0,47)+" - Flash Player Installation";this.addVariable("MMdoctitle",document.title);}}if(this.skipDetect||this.getAttribute("doExpressInstall")||this.installedVer.versionIsValid(this.getAttribute("version"))){var n=(typeof _20=="string")?document.getElementById(_20):_20;n.innerHTML=this.getSWFHTML();return true;}else{if(this.getAttribute("redirectUrl")!=""){document.location.replace(this.getAttribute("redirectUrl"));}}return false;}};deconcept.SWFObjectUtil.getPlayerVersion=function(){var _23=new deconcept.PlayerVersion([0,0,0]);if(navigator.plugins&&navigator.mimeTypes.length){var x=navigator.plugins["Shockwave Flash"];if(x&&x.description){_23=new deconcept.PlayerVersion(x.description.replace(/([a-zA-Z]|\s)+/,"").replace(/(\s+r|\s+b[0-9]+)/,".").split("."));}}else{if(navigator.userAgent&&navigator.userAgent.indexOf("Windows CE")>=0){var axo=1;var _26=3;while(axo){try{_26++;axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash."+_26);_23=new deconcept.PlayerVersion([_26,0,0]);}catch(e){axo=null;}}}else{try{var axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7");}catch(e){try{var axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");_23=new deconcept.PlayerVersion([6,0,21]);axo.AllowScriptAccess="always";}catch(e){if(_23.major==6){return _23;}}try{axo=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");}catch(e){}}if(axo!=null){_23=new deconcept.PlayerVersion(axo.GetVariable("$version").split(" ")[1].split(","));}}}return _23;};deconcept.PlayerVersion=function(_29){this.major=_29[0]!=null?parseInt(_29[0]):0;this.minor=_29[1]!=null?parseInt(_29[1]):0;this.rev=_29[2]!=null?parseInt(_29[2]):0;};deconcept.PlayerVersion.prototype.versionIsValid=function(fv){if(this.major<fv.major){return false;}if(this.major>fv.major){return true;}if(this.minor<fv.minor){return false;}if(this.minor>fv.minor){return true;}if(this.rev<fv.rev){return false;}return true;};deconcept.util={getRequestParameter:function(_2b){var q=document.location.search||document.location.hash;if(_2b==null){return q;}if(q){var _2d=q.substring(1).split("&");for(var i=0;i<_2d.length;i++){if(_2d[i].substring(0,_2d[i].indexOf("="))==_2b){return _2d[i].substring((_2d[i].indexOf("=")+1));}}}return "";}};deconcept.SWFObjectUtil.cleanupSWFs=function(){var _2f=document.getElementsByTagName("OBJECT");for(var i=_2f.length-1;i>=0;i--){_2f[i].style.display="none";for(var x in _2f[i]){if(typeof _2f[i][x]=="function"){_2f[i][x]=function(){};}}}};if(deconcept.SWFObject.doPrepUnload){if(!deconcept.unloadSet){deconcept.SWFObjectUtil.prepUnload=function(){__flash_unloadHandler=function(){};__flash_savedUnloadHandler=function(){};window.attachEvent("onunload",deconcept.SWFObjectUtil.cleanupSWFs);};window.attachEvent("onbeforeunload",deconcept.SWFObjectUtil.prepUnload);deconcept.unloadSet=true;}}if(!document.getElementById&&document.all){document.getElementById=function(id){return document.all[id];};}

	// �������� SWF � DOM
	function addSWFObject(url, flashId, ww, hh, v, bg, loadCallback, FlagFlashLSO)
	{
		var o = new gmxAPI._flashDeconcept.SWFObject(url, flashId, ww, hh, v, bg);
		o.addParam('allowScriptAccess', 'always');
		o.addParam('wmode', 'opaque');
		o.addVariable("clearCallback", uniqueGlobalName(function(name) { delete window[name]; }));
		o.addVariable("loadCallback", uniqueGlobalName(loadCallback));
		if(FlagFlashLSO) {
			o.addVariable("useFlashLSO", true);
			if(FlagFlashLSO.multiSession) o.addVariable("multiSessionLSO", true);
			if(FlagFlashLSO.compress) o.addVariable("compressLSO", true);
		}
		return o;
	}
	
	//��������� namespace
    gmxAPI._cmdProxy = FlashCMD;	// ������� ������ �����������
    gmxAPI._flashDeconcept = deconcept;	// ������� Flash � DOM
    gmxAPI._addSWFObject = addSWFObject;	// �������� SWF � DOM
    
})();
