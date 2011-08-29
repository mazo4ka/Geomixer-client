var fileBrowser = function()
{
	this.parentCanvas = null;
	
	this.homeDir = '';
	
	this.currentDir = '';
	this.currentFiles = [];
	
	this.slash = "\\";
	
	this.fileCanvas = null;
	this.fileHeader = null;
	this.fileUpload = null;
	
	this.sortFuncs = 
	{
		name:[
			function(_a,_b){var a = String(_a.Name).toLowerCase(), b = String(_b.Name).toLowerCase(); if (a > b) return 1; else if (a < b) return -1; else return 0},
			function(_a,_b){var a = String(_a.Name).toLowerCase(), b = String(_b.Name).toLowerCase(); if (a < b) return 1; else if (a > b) return -1; else return 0}
		],
		ext:[
			function(_a,_b)
			{
				var a = String(_a.Name).toLowerCase(),
					b = String(_b.Name).toLowerCase(),
					index1 = a.lastIndexOf('.'),
					ext1 = a.substr(index1 + 1, a.length),
					index2 = b.lastIndexOf('.'),
					ext2 = b.substr(index2 + 1, b.length);
				
				if (ext1 > ext2) return 1; else if (ext1 < ext2) return -1; else return 0;
			},
			function(_a,_b)
			{
				var a = String(_a.Name).toLowerCase(),
					b = String(_b.Name).toLowerCase(),
					index1 = a.lastIndexOf('.'),
					ext1 = a.substr(index1 + 1, a.length),
					index2 = b.lastIndexOf('.'),
					ext2 = b.substr(index2 + 1, b.length);
				
				if (ext1 < ext2) return 1; else if (ext1 > ext2) return -1; else return 0;
			}
		],
		size:[
			function(a,b){return a.Size - b.Size},
			function(a,b){return b.Size - a.Size}
		],
		date:[
			function(a,b){return a.Date - b.Date},
			function(a,b){return b.Date - a.Date}
		]
	};
	
	this.currentSortType = 'name';
	this.currentSortIndex = 
	{
		name: 0,
		ext: 0,
		size: 0,
		date: 0
	};
		
	this.shownPathScroll = false;

	this.returnMask = ['noname'];
	
	this.driveRE = new RegExp(/^[a-z]:\\$/i);
	
	this.discs = null;
	
	this.ext7z = ['7Z', 'ZIP', 'GZIP', 'BZIP2', 'TAR', 'ARJ', 'CAB', 'CHM', 'CPIO', 'DEB', 'DMG', 'HFS', 'ISO', 'LZH', 'LZMA', 'MSI', 'NSIS', 'RAR', 'RPM', 'UDF', 'WIM', 'XAR', 'Z'];
}

fileBrowser.prototype.createBrowser = function(title, mask, closeFunc)
{
	if ($$('fileBrowserDialog'))
	{
		$($$('fileBrowserDialog').parentNode).dialog("destroy");
		
		$$('fileBrowserDialog').parentNode.removeNode(true);
	}
	
	var canvas = _div(null, [['attr','id','fileBrowserDialog']]);
	
	showDialog(title, canvas, 800, 400, false, false, this.resize);
	
	this.returnMask = mask;
	this.parentCanvas = canvas;
	this.closeFunc = closeFunc;
	
	if (!this.discs)
		this.loadInfo();
	else
		this.loadInfoHandler(this.discs)
}

fileBrowser.prototype.resize = function()
{
	if (!$("#fileBrowserDialog").find(".fileCanvas").length)
		return;
	
	var titleHeight = $$('fileBrowserDialog').parentNode.parentNode.firstChild.offsetHeight;
	
	$$('fileBrowserDialog').childNodes[1].lastChild.style.height = $$('fileBrowserDialog').parentNode.parentNode.offsetHeight - titleHeight - 6 - $$('fileBrowserDialog').lastChild.offsetHeight - $$('fileBrowserDialog').firstChild.offsetHeight - $$('fileBrowserDialog').childNodes[1].firstChild.offsetHeight - 15 + 'px';
}

fileBrowser.prototype.close = function(path)
{
	this.closeFunc(path);
	
	var canvas = $$('fileBrowserDialog');
	
	$(canvas.parentNode).dialog("destroy");
	
	canvas.parentNode.removeNode(true);
}

fileBrowser.prototype.loadInfo = function()
{
	sendCrossDomainJSONRequest(serverBase + "FileBrowser/GetDrives.ashx?WrapStyle=func", function(response)
	{
		if (!parseResponse(response))
			return;
		
		_fileBrowser.loadInfoHandler(response.Result)
	})
}
fileBrowser.prototype.loadInfoHandler = function(discs)
{
	this.discs = discs;
	this.homeDir = userInfo().Folder;
	
	if (this.currentDir == '')
	{
		if (_mapHelper.mapProperties.LayersDir)
			this.currentDir = _mapHelper.mapProperties.LayersDir;
		else
			this.currentDir = userInfo().Folder;
	}
	
	this.currentSortFunc = this.sortFuncs['name'][0];
	
	this.fileUpload = _div(null, [['dir','className','fileUpload']]);
	this.fileHeader = _div(null, [['css','height','24px']]);
	this.fileCanvas = _div(null, [['dir','className','fileCanvas']]);
	
	_(this.parentCanvas, [this.fileHeader, this.fileCanvas, this.fileUpload]);
	
	this.createHeader(this.discs);
	this.createUpload();
	
	this.checkUploadVisibility();
	
	this.getFiles();
}

fileBrowser.prototype.checkUploadVisibility = function()
{
	if (this.currentDir.indexOf(this.homeDir) == 0)
	{
		this.fileUpload.style.display = '';
		this.tdAddFolder.style.display = '';
	}
	else
	{
		this.fileUpload.style.display = 'none';
		this.tdAddFolder.style.display = 'none';
	}
}

fileBrowser.prototype.createHeader = function(discs)
{
	var reloadButton = makeImageButton("img/reload.png"),
		homeButton = makeImageButton("img/home.png"),
		discButtonTds = [],
		_this = this;
	
	reloadButton.style.margin = '0px 5px 0px 10px';
	homeButton.style.margin = '0px 10px 0px 5px';
	
	reloadButton.style.width = '14px';
	reloadButton.style.height = '15px';
	homeButton.style.width = '15px';
	homeButton.style.height = '15px';
	
	_title(reloadButton, _gtxt("Обновить"));
	_title(homeButton, _gtxt("Домашняя директория"));
	
	reloadButton.onclick = function()
	{
		_this.getFiles();
	}
	
	homeButton.onclick = function()
	{
		_this.getFiles(_this.homeDir);
	}
	
	if ( nsMapCommon.AuthorizationManager.canDoAction(nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE ) )
	{
		for (var i = 0; i < discs.length; i++)
		{
			var discButtons = makeButton(discs[i]);
			
			(function(i)
			{
				discButtons.onclick = function()
				{
					_this.getFiles(discs[i])
				}
			})(i)
			
			discButtonTds.push(_td([discButtons]))
		}
	}
	
	discButtonTds.push(_td([reloadButton], [['attr','vAlign','top']]));
	discButtonTds.push(_td([homeButton], [['attr','vAlign','top']]));
	
	var newFolderName = _input(null, [['dir','className','inputStyle'], ['css','width','150px']]),
		showFolderButton = makeImageButton("img/newfolder.png")
		newFolderButton = makeButton(_gtxt("Создать")),
		inputError = function()
		{
			$(newFolderName).addClass('error');
			
			setTimeout(function()
			{
				if (newFolderName)
					$(newFolderName).removeClass('error');
			}, 1000)
		},
		createFolder = function()
		{
			sendCrossDomainJSONRequest(serverBase + 'FileBrowser/CreateFolder.ashx?WrapStyle=func&FullName=' + _this.currentDir + '\\' + newFolderName.value, function(response)
			{
				if (!parseResponse(response))
					return;
				
				_this.shownPath = newFolderName.value;
				
				newFolderName.value = '';
				
				_this.getFiles();
			})
		};
		
	showFolderButton.style.width = '16px';
	showFolderButton.style.height = '13px';
	
	newFolderName.style.margin = '0px 3px';
	
	_title(showFolderButton, _gtxt("Новая папка"))
	
	showFolderButton.style.marginRight = '10px';
	
	showFolderButton.onclick = function()
	{
		if (newFolderName.style.display == 'none')
		{
			newFolderName.style.display = '';
			newFolderButton.style.display = '';
		}
		else
		{
			newFolderName.style.display = 'none';
			newFolderButton.style.display = 'none';
		}
	}
	
	newFolderName.style.display = 'none';
	newFolderButton.style.display = 'none';
		
	newFolderName.onkeydown = function(e)
	{
		var evt = e || window.event;
	  	if (getkey(evt) == 13) 
	  	{
	  		if (newFolderName.value != '')
				createFolder();
			else
				inputError();
	  		
	  		return false;
	  	}
	}
	
	newFolderButton.onclick = function()
	{
		if (newFolderName.value != '')
			createFolder();
		else
			inputError();
	}
	
	this.tdAddFolder = _td([_table([_tbody([_tr([_td([showFolderButton], [['attr','vAlign','top']]),_td([newFolderName]),_td([newFolderButton])])])])], [['attr','vAlign','top']]),
	discButtonTds.push(this.tdAddFolder);
	
	_(this.fileHeader, [_table([_tbody([_tr(discButtonTds)])])]);
}

fileBrowser.prototype.createUpload = function()
{
	var uploadPath = _input(null,[['attr','type','hidden'],['attr','name','ParentDir']]),
		uploadFileButton = makeButton(_gtxt("Загрузить файл")),
		div = _div(null, [['css','height','30px'],['css','marginTop','10px']]),
		_this = this;
	
	var formFile = ($.browser.msie) ? document.createElement('<form enctype="multipart/form-data" method="post" action="' + serverBase + 'FileBrowser/Upload.ashx?WrapStyle=window" target="fileBrowserUpload_iframe">') : _form(null,[['attr','enctype','multipart/form-data'],['dir','method','post'],['dir','action', serverBase + 'FileBrowser/Upload.ashx?WrapStyle=window'],['attr','target','fileBrowserUpload_iframe']]);
	_(formFile, [uploadPath]);

	var attach = ($.browser.msie) ? document.createElement('<input type="file" name="rawdata" width="200px">') : _input(null,[['attr','type','file'],['dir','name','rawdata'],['css','width','200px']]);
	_(formFile, [attach]);
	
	uploadFileButton.onclick = function()
	{
		var iframe = createPostIframe("fileBrowserUpload_iframe", function(response)
		{
			if (!parseResponse(response))
				return;
			
			var indexSlash = String(response.Result).lastIndexOf('\\'),
				fileName = String(response.Result).substring(indexSlash + 1, response.Result.length);
			
			_this.shownPath = fileName;
			
			_this.getFiles();
		});
		
		_(document.body, [iframe]);
		
		uploadPath.setAttribute('value',_this.currentDir)
		formFile.submit();
	}
	
	_(div, [_table([_tbody([_tr([_td([formFile]), _td([uploadFileButton])])])])]);
	
	_(this.fileUpload, [div]);
}

fileBrowser.prototype.getFiles = function(path)
{
	var path = (typeof path != 'undefined') ? path : this.currentDir;
	
	sendCrossDomainJSONRequest(serverBase + "FileBrowser/GetDirectoryContent.ashx?WrapStyle=func&root=" + path,  function(response)
	{
		if (!parseResponse(response))
			return;
		
		_fileBrowser.getFilesHandler(response.Result, path)
	})
}

fileBrowser.prototype.getFilesHandler = function(files, path)
{
	this.currentDir = path;
	this.currentFiles = files;

	this.checkUploadVisibility();

	this.reloadFiles();
}

fileBrowser.prototype.minimizeUserPath = function()
{
	if ( nsMapCommon.AuthorizationManager.canDoAction(nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE ) )
		return this.currentDir;
	
	var shortPath = this.currentDir.replace(this.homeDir, "");
	
	if (shortPath == "")
		shortPath = "\\";
	
	return shortPath;
}

fileBrowser.prototype.quickSearch = function()
{
	var input = _input(null, [['dir','className','inputStyle'],['css','width','200px']]),
		_this = this;
	
	input.onkeyup = function()
	{
		if (this.value != "")
		{
			var scroll = _this.findContent(this.value);
			
			if (scroll >= 0)
				_this.fileCanvas.lastChild.scrollTop = scroll;
		}
	}
	
	return input;
}

fileBrowser.prototype.findContent = function(value)
{
	var tbody = this.fileCanvas.lastChild.firstChild.lastChild;
	
	for (var i = 0; i < tbody.childNodes.length; ++i)
	{
		var text = $.browser.msie ? tbody.childNodes[i].outerText.toLowerCase() : tbody.childNodes[i].textContent.toLowerCase()
		
		if (text != "[..]" && text.indexOf(value.toLowerCase()) == 0)
			return tbody.childNodes[i].offsetTop;
	}
	
	return -1;	
}

fileBrowser.prototype.reloadFiles = function()
{
	removeChilds(this.fileCanvas)
	
	_(this.fileCanvas, [_div([_t(this.minimizeUserPath()), _br(), _t(_gtxt("Фильтр")), this.quickSearch()], [['dir','className','currentDir'],['css','color','#153069'],['css','fontSize','12px']])]);
	
	_(this.fileCanvas, [this.draw(this.currentFiles)]);
	
	this.resize();
	
	if (this.shownPathScroll)
	{
		this.fileCanvas.lastChild.scrollTop = this.shownPathScroll.offsetTop;
		
		this.shownPathScroll = false;
	}
}

fileBrowser.prototype.draw = function(files)
{
	var nameSort = makeLinkButton(_gtxt("Имя")),
		extSort = makeLinkButton(_gtxt("Тип")),
		sizeSort = makeLinkButton(_gtxt("Размер")),
		dateSort = makeLinkButton(_gtxt("Дата")),
		_this = this;
	
	nameSort.sortType = 'name';
	extSort.sortType = 'ext';
	sizeSort.sortType = 'size';
	dateSort.sortType = 'date';
	
	nameSort.onclick = extSort.onclick = sizeSort.onclick = dateSort.onclick = function()
	{
		_this.currentSortType = this.sortType;
		_this.currentSortIndex[_this.currentSortType] = 1 - _this.currentSortIndex[_this.currentSortType];
		
		_this.reloadFiles();
	}
	
	var tdRoot = _td(null, [['css','width','20px']]);
	
	if ( nsMapCommon.AuthorizationManager.canDoAction(nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE ) )
	{
		var rootButton = makeButton("\\");
		
		_(tdRoot, [rootButton]);
		
		rootButton.onclick = function()
		{
			var index = String(_this.currentDir).indexOf(_this.slash),
				newPath = String(_this.currentDir).substr(0, index) + _this.slash;
			
			_this.getFiles(newPath);
		}
	}
	
	var tableHeaderTr = _tr([tdRoot, _td([nameSort],[['css','textAlign','left']]), _td([extSort], [['css','width','10%'],['css','textAlign','center']]), _td([sizeSort], [['css','width','15%'],['css','textAlign','center']]), _td([dateSort], [['css','width','25%'],['css','textAlign','center']])]),
		prevDirTr = _tr([_td(), _td([_t("[..]")]), _td(), _td(), _td()]),
		tableFilesTrs = [];
	
	if (!this.isDrive())
	{
		if (nsMapCommon.AuthorizationManager.canDoAction(nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE ) ||
			this.currentDir.indexOf(this.homeDir) == 0 && this.currentDir.length > this.homeDir.length)
			tableFilesTrs.push(prevDirTr)
	
		attachEffects(prevDirTr, 'hover')

		prevDirTr.onclick = function()
		{
			var index = String(_this.currentDir).lastIndexOf(_this.slash),
				newPath = String(_this.currentDir).substr(0, index);
			
			if (new RegExp(/^[a-z]:$/i).test(newPath))
				newPath += _this.slash;
			
			_this.getFiles(newPath);
		}
	}
	
	tableFilesTrs = tableFilesTrs.concat(this.drawFolders(files));
	tableFilesTrs = tableFilesTrs.concat(this.drawFiles(files));
	
	return _div([_table([_thead([tableHeaderTr]), _tbody(tableFilesTrs)], [['css','width','100%']])], [['css','overflowY','scroll']]);
}

fileBrowser.prototype.isDrive = function()
{
	return this.driveRE.test(this.currentDir);
}

fileBrowser.prototype.getCurrentSortFunc = function()
{
	return this.sortFuncs[this.currentSortType][this.currentSortIndex[this.currentSortType]];
}

fileBrowser.prototype.formatDate = function(sec)
{
	var sysDate = new Date(sec * 1000),
		date = [];
	
	date[0] = sysDate.getDate(),
	date[1] = sysDate.getMonth() + 1,
	date[2] = sysDate.getFullYear(),
	date[3] = sysDate.getHours(),
	date[4] = sysDate.getMinutes(),
	date[5] = sysDate.getSeconds();
	
	for (var i = 0; i < 6; i++)
		if (date[i] < 10)
			date[i] = '0' + date[i];

	return date[0] + '.' + date[1] + '.' + date[2] + ' ' + date[3] + ':' + date[4] + ':' + date[5];
}

fileBrowser.prototype.drawFolders = function(arr)
{
	var folders = [],
		trs = [],
		_this = this;;
	
	for (var i = 0; i < arr.length; i++)
		if (arr[i].Directory)
			folders.push(arr[i]);
	
	if (this.currentSortType == 'name' || this.currentSortType == 'date')
		folders = folders.sort(this.getCurrentSortFunc());
	
	for (var i = 0; i < folders.length; i++)
	{
		var tdReturn = _td();
		
		if (!this.returnMask.length)
		{
			var returnButton = makeImageButton("img/choose.png", "img/choose_a.png");
			returnButton.style.cursor = 'pointer';
			returnButton.style.marginLeft = '5px';
			
			_title(returnButton, _gtxt("Выбрать"));
			
			(function(i){
				returnButton.onclick = function(e)
				{
					_this.close(_this.currentDir + (_this.isDrive() ? '' : _this.slash) + folders[i].Name);
				}
			})(i);
			
			_(tdReturn, [returnButton])
		}
		
		var tr = _tr([tdReturn, _td([_img(null, [['attr','src','img/folder.png'],['css','margin','0px 3px -3px 0px']]), this.createFolderActions(folders[i].Name)]), _td(), _td([_t(_gtxt("Папка"))],[['css','textAlign','center'],['dir','className','invisible']]), _td([_t(this.formatDate(folders[i].Date))],[['css','textAlign','center'],['dir','className','invisible']])]);
		
		(function(i){
			tr.onclick = function()
			{
				_this.getFiles(_this.currentDir + (_this.isDrive() ? '' : _this.slash) + folders[i].Name);
			}
		})(i);
		
		attachEffects(tr, 'hover');
		
		if (this.shownPath && folders[i].Name == this.shownPath)
		{
			$(tr).children("td").css('backgroundColor', '#CEEECE');
			
			this.shownPath = null;
			
			this.shownPathScroll = tr;
		}
		
		trs.push(tr)
	}
	
	return trs;
}

fileBrowser.prototype.drawFiles = function(arr)
{
	var files = [],
		trs = [],
		_this = this;
	
	for (var i = 0; i < arr.length; i++)
		if (!arr[i].Directory)
			files.push(arr[i]);
	
	files = files.sort(this.getCurrentSortFunc());
	
	for (var i = 0; i < files.length; i++)
	{
		var index = String(files[i].Name).lastIndexOf('.'),
			name = String(files[i].Name).substr(0, index),
			ext = String(files[i].Name).substr(index + 1, files[i].Name.length),
			tdReturn = _td()
			tdSize = _td([_t(this.makeSize(files[i].Size))], [['attr','size',files[i].Size],['css','textAlign','right'],['dir','className','invisible']]);
		
		if (this.returnMask.length && valueInArray(this.returnMask, ext.toLowerCase()))
		{
			var returnButton = makeImageButton("img/choose.png", "img/choose_a.png");
			returnButton.style.cursor = 'pointer';
			returnButton.style.marginLeft = '5px';
			
			_title(returnButton, _gtxt("Выбрать"));
			
			(function(i){
				returnButton.onclick = function(e)
				{
					_this.close(_this.currentDir + (_this.isDrive() ? '' : _this.slash) + files[i].Name);
				}
			})(i);
			
			_(tdReturn, [returnButton])
		}
		
		var	tr = _tr([tdReturn, _td([this.createFileActions(name, ext)]), _td([_t(ext)],[['css','textAlign','right'],['css','fontSize','12px']]), tdSize, _td([_t(this.formatDate(files[i].Date))],[['css','textAlign','center'],['dir','className','invisible']])]);
		
		attachEffects(tr, 'hover');
		
		if (this.shownPath && files[i].Name == this.shownPath)
		{
			$(tr).children("td").css('backgroundColor', '#CEEECE');
			
			this.shownPath = null;
			
			this.shownPathScroll = tr;
		}

		trs.push(tr)
	}
	
	return trs;
}

fileBrowser.prototype.createFolderActions = function(name)
{
	var span = _span([_t(name)],[['css','fontSize','12px']]),
		spanParent = _div([span],[['css','display',($.browser.msie) ? 'inline' : 'inline-block'],['css','position','relative']]),
		_this = this;

	if ($.browser.msie)
		spanParent.style.zIndex = 1;
	
	var download = makeLinkButton(_gtxt("Скачать")),
		remove = makeLinkButton(_gtxt("Удалить")),
		archive = makeLinkButton(_gtxt("Упаковать")),
		clean = makeLinkButton(_gtxt("Очистить"));
	
	download.onclick = function(e)
	{
		_contextClose();
		
		var form = _form([_input(null,[['attr','name','FullName'], ['attr','value', _this.currentDir + '\\' + name]])], [['css','display','none'],['attr','method','POST'],['attr','action',serverBase + "FileBrowser/Download.ashx"]]);
		
		_(document.body, [form]);
		
		form.submit();
		
		form.removeNode(true);
		
		stopEvent(e);
	}
	
	remove.onclick = function(e)
	{
		_contextClose();
		
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/Delete.ashx?WrapStyle=func&FullName=' + _this.currentDir + '\\' + name, function(response)
		{
			if (!parseResponse(response))
				return;
			
			_this.getFiles();
		})
		
		stopEvent(e);
	}
	
	archive.onclick = function(e)
	{
		_contextClose();
		
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/Zip.ashx?WrapStyle=func&FullName=' + _this.currentDir + '\\' + name, function(response)
		{
			if (!parseResponse(response))
				return;
			
			var indexSlash = String(response.Result).lastIndexOf('\\'),
				fileName = String(response.Result).substring(indexSlash + 1, response.Result.length);
			
			_this.shownPath = fileName;
			
			_this.getFiles();
		})
		
		stopEvent(e);
	}
	
	clean.onclick = function(e)
	{
		_contextClose();
		
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/CleanFolder.ashx?WrapStyle=func&FullName=' + _this.currentDir + '\\' + name, function(response)
		{
			if (!parseResponse(response))
				return;
			
			_this.getFiles();
		})
		
		stopEvent(e);
	}
	
	var actionsCanvas = _div([_div([download],[['dir','className','contextMenuItem']]), _div([remove],[['dir','className','contextMenuItem']]), _div([archive],[['dir','className','contextMenuItem']]), _div([clean],[['dir','className','contextMenuItem']])], [['css','width','120px']]);
	if ($.browser.opera)
		_attr(actionsCanvas, [['dir','className','layerSuggest']]);
		
	_context(spanParent, actionsCanvas, function()
	{
		//показывать меню только в домашней директории или если есть права на просмотр всей структуры папок
		return _this.currentDir.indexOf(_this.homeDir) >= 0 || nsMapCommon.AuthorizationManager.canDoAction( nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE );
	}, _layersTree.suggestTimeout);

	return spanParent;
}

fileBrowser.prototype.createFileActions = function(name, ext)
{
	var span = _span([_t(name)],[['css','fontSize','12px']]),
		spanParent = _div([span],[['css','display',($.browser.msie) ? 'inline' : 'inline-block'],['css','position','relative']]),
		_this = this;

	if ($.browser.msie)
		spanParent.style.zIndex = 1;
	
	var download = makeLinkButton(_gtxt("Скачать")),
		remove = makeLinkButton(_gtxt("Удалить")),
		archive = makeLinkButton(valueInArray(this.ext7z, ext.toUpperCase()) ? _gtxt("Извлечь") : _gtxt("Упаковать"));
	
	download.onclick = function(e)
	{
		_contextClose();
		
		var form = _form([_input(null,[['attr','name','FullName'], ['attr','value', _this.currentDir + '\\' + name + '.' + ext]])], [['css','display','none'],['attr','method','POST'],['attr','action',serverBase + "FileBrowser/Download.ashx"]]);
		
		_(document.body, [form]);
		
		form.submit();
		
		form.removeNode(true);
	}
	
	remove.onclick = function(e)
	{
		_contextClose();
		
		sendCrossDomainJSONRequest(serverBase + 'FileBrowser/Delete.ashx?WrapStyle=func&FullName=' + _this.currentDir + '\\' + name + '.' + ext, function(response)
		{
			if (!parseResponse(response))
				return;
			
			_this.getFiles();
		})
	}
	
	archive.onclick = function()
	{
		_contextClose();
		
		sendCrossDomainJSONRequest(serverBase + (valueInArray(_this.ext7z, ext.toUpperCase()) ? 'FileBrowser/Unzip.ashx' : 'FileBrowser/Zip.ashx') + '?WrapStyle=func&FullName=' + _this.currentDir + '\\' + name + '.' + ext, function(response)
		{
			if (!parseResponse(response))
				return;
			
			var indexSlash = String(response.Result).lastIndexOf('\\'),
				fileName = String(response.Result).substring(indexSlash + 1, response.Result.length);
			
			_this.shownPath = fileName;
			
			_this.getFiles();
		})
	}
	
	var actionsCanvas = _div([_div([download],[['dir','className','contextMenuItem']]), _div([remove],[['dir','className','contextMenuItem']]), _div([archive],[['dir','className','contextMenuItem']])], [['css','width','120px']]);
	
	if ($.browser.opera)
		_attr(actionsCanvas, [['dir','className','layerSuggest']]);
		
	_context(spanParent, actionsCanvas, function()
	{
		//показывать меню только в домашней директории или если есть права на просмотр всей структуры папок
		return _this.currentDir.indexOf(_this.homeDir) >= 0 || nsMapCommon.AuthorizationManager.canDoAction( nsMapCommon.AuthorizationManager.ACTION_SEE_FILE_STRUCTURE );
	}, _layersTree.suggestTimeout)
	
	return spanParent;
}

fileBrowser.prototype.makeSize = function(size)
{
	if (size > 1024 * 1024 * 1024)
		return (size / (1024 * 1024 * 1024)).toFixed(2) + ' Гб';
	else if (size > 1024 * 1024)
		return (size / (1024 * 1024)).toFixed(2) + ' Мб';
	else if (size > 1024)
		return (size / 1024).toFixed(2) + ' Кб';
	
	return size + ' б';
}

var _fileBrowser = new fileBrowser();


var tableBrowser = function()
{
	this.parentCanvas = null;
	
	this.sortFuncs = 
	{
		name:[
			function(_a,_b){var a = String(_a).toLowerCase(), b = String(_b).toLowerCase(); if (a > b) return 1; else if (a < b) return -1; else return 0},
			function(_a,_b){var a = String(_a).toLowerCase(), b = String(_b).toLowerCase(); if (a < b) return 1; else if (a > b) return -1; else return 0}
		]
	};
		
	this.currentSortType = 'name';
	this.currentSortIndex = 
	{
		name: 0
	};
	
	this.tables = [];
}

tableBrowser.prototype.createBrowser = function(closeFunc)
{
	if ($$('tableBrowserDialog'))
	{
		$($$('tableBrowserDialog').parentNode).dialog("destroy");
		
		$$('tableBrowserDialog').parentNode.removeNode(true);
	}
	
	var canvas = _div(null, [['attr','id','tableBrowserDialog']]);
	
	showDialog(_gtxt("Список таблиц"), canvas, 300, 300, false, false);
	
	this.parentCanvas = canvas;
	this.closeFunc = closeFunc;
	
	if (!this.tables.length)
		this.loadInfo();
	else
		this.loadInfoHandler(this.tables)
}

tableBrowser.prototype.close = function(name)
{
	this.closeFunc(name);
	
	var canvas = $$('tableBrowserDialog');
	
	$(canvas.parentNode).dialog("destroy");
	
	canvas.parentNode.removeNode(true);
}

tableBrowser.prototype.loadInfo = function()
{
	sendCrossDomainJSONRequest(serverBase + "VectorLayer/GetGeometryTables.ashx?WrapStyle=func", function(response)
	{
		if (!parseResponse(response))
			return;
		
		_tableBrowser.loadInfoHandler(response.Result)
	})
}

tableBrowser.prototype.loadInfoHandler = function(tables)
{
	this.tables = tables;
	
	this.currentSortFunc = this.sortFuncs['name'][0];
	
	this.tablesCanvas = _div(null, [['dir','className','fileCanvas']]);	
	
	_(this.parentCanvas, [this.tablesCanvas]);
	
	this.reloadTables();
}

tableBrowser.prototype.reloadTables = function()
{
	removeChilds(this.tablesCanvas)
	
	_(this.tablesCanvas, [this.draw()]);
}

tableBrowser.prototype.draw = function()
{
	var nameSort = makeLinkButton(_gtxt("Имя")),
		trs = [],
		_this = this;
	
	nameSort.sortType = 'name';
	
	nameSort.onclick = function()
	{
		_this.currentSortType = this.sortType;
		_this.currentSortIndex[_this.currentSortType] = 1 - _this.currentSortIndex[_this.currentSortType];
		
		_this.reloadTables();
	}
	
	this.tables = this.tables.sort(this.getCurrentSortFunc());
	
	for (var i = 0; i < this.tables.length; i++)
	{
		var	tdName = _td([_t(this.tables[i])],[['css','fontSize','12px']]),
			returnButton = makeImageButton("img/choose.png", "img/choose_a.png"),
			tr = _tr([_td([returnButton]), tdName]);
		
		returnButton.style.cursor = 'pointer';
		returnButton.style.marginLeft = '5px';
	
		_title(returnButton, _gtxt("Выбрать"));
			
		(function(i){
			returnButton.onclick = function()
			{
				_this.close(_this.tables[i]);
			}
		})(i);
		
		attachEffects(tr, 'hover')
		
		trs.push(tr)
	}
	
	return _table([_thead([_tr([_td(null, [['css','width','25px']]),_td([nameSort], [['css','textAlign','left']])])]), _tbody(trs)], [['css','width','100%']]);
}

tableBrowser.prototype.getCurrentSortFunc = function()
{
	return this.sortFuncs[this.currentSortType][this.currentSortIndex[this.currentSortType]];
}

var _tableBrowser = new tableBrowser();