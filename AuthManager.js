/** Менеджер аудетификационной информации системы. Умеет запрашивать у сервера текущий статус пользователя,
 хранит информацию о ролях и допустимых действиях пользователей с этой ролью.
 @memberOf nsGmx
 @class
 @name AuthManager
*/
var nsGmx = nsGmx || {};
(function($)
{
    $.extend(nsGmx, {
        ROLE_ADMIN        : 'admin', 
        ROLE_USER         : 'user',
        ROLE_GUEST        : 'guest',
        ROLE_UNAUTHORIZED : 'none',
        
        ACTION_CREATE_LAYERS        : 'createData',      // Создавать новые слои (векторные и растровые)
        ACTION_CREATE_MAP           : 'createMap',       // Cоздавать новые карты
        ACTION_SAVE_MAP             : 'saveMap',         // Сохранять карту (нужны права редактирования на карту)
        ACTION_CHANGE_MAP_TYPE      : 'changeType',      // Менять тип карты (публичная/открытая/закрытая и т.п.)
        ACTION_SEE_OPEN_MAP_LIST    : 'openMap',         // Видеть список публичных карт
        ACTION_SEE_PRIVATE_MAP_LIST : 'privateMap',      // Видеть спискок всех карт
        ACTION_SEE_MAP_RIGHTS       : 'seeRights',       // Видеть и редактировать права пользователей (для объектов, владельцем которых является)
        ACTION_SEE_FILE_STRUCTURE   : 'seeFiles',        // Видеть всю файловую структуру сервера, а не только свою дом. директорию
        ACTION_SEE_ALL_USERS        : 'seeUsers',        // Видеть список всех пользователей
        ACTION_SEE_USER_FULLNAME    : 'seeUserFullname', // Видеть полные имена и логины пользователей (а не только псевдонимы)
        ACTION_UPLOAD_FILES         : 'uploadFiles'      // Загружать файлы на сервер через web-интерфейс
    });
    
    var _actions = {};
    _actions[nsGmx.ROLE_ADMIN] = {};    
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_CREATE_LAYERS       ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_CREATE_MAP          ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SAVE_MAP            ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_OPEN_MAP_LIST   ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_PRIVATE_MAP_LIST] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_CHANGE_MAP_TYPE     ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_MAP_RIGHTS      ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_FILE_STRUCTURE  ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_ALL_USERS       ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_SEE_USER_FULLNAME   ] = true;
    _actions[nsGmx.ROLE_ADMIN][nsGmx.ACTION_UPLOAD_FILES        ] = true;
    
    _actions[nsGmx.ROLE_USER] = {};
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_CREATE_LAYERS     ] = true;
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_CREATE_MAP        ] = true;
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_SAVE_MAP          ] = true;
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_SEE_OPEN_MAP_LIST ] = true;
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_SEE_MAP_RIGHTS    ] = true;
    _actions[nsGmx.ROLE_USER][nsGmx.ACTION_UPLOAD_FILES      ] = true;
    
    _actions[nsGmx.ROLE_GUEST] = {}
    _actions[nsGmx.ROLE_GUEST][nsGmx.ACTION_SEE_OPEN_MAP_LIST ] = true;
    _actions[nsGmx.ROLE_GUEST][nsGmx.ACTION_SAVE_MAP          ] = true;
    
    nsGmx.AuthManager = new function()
    {
        var _userInfo = null;
        var _this = this;
        var _token = null;
		var _tokenExpires = null;
		
		this.getToken = function(){
			return _token;
		}
		
		this.setToken = function(value){
			_token = value;
		}
		
		this.getExpires = function(){
			return _tokenExpires;
		}
		
		this.setExpires = function(value){
			_tokenExpires = value;
		}
		
        this.getLogin = function()
        {
            if (!_userInfo) return null;
            return _userInfo.Login || null;
        };
        
        this.getNickname = function()
        {
            if (!_userInfo) return null;
            return _userInfo.Nickname || null;
        };
        
        this.getFullname = function()
        {
            if (!_userInfo) return null;
            return _userInfo.Fullname || null;
        };
        
        this.getUserFolder = function()
        {
            if (!_userInfo) return null;
            return _userInfo.Folder;
        };
        
        this.isRole = function(role)
        {
            return _userInfo && _userInfo.Role === role;
        };
        
        this.canDoAction = function(action)
        {
            return _userInfo && _userInfo.Role in _actions && action in _actions[_userInfo.Role];
        };
        
        this.isAccounts = function()
        {
            return _userInfo && _userInfo.IsAccounts;
        };
        
        this.isLogin = function()
        {
            return _userInfo && _userInfo.Login !== false && _userInfo.Role !== this.ROLE_UNAUTHORIZED;
        };
        
        this.setUserInfo = function(userInfo)
        {
            _userInfo = $.extend({}, {IsAccounts: false, Role: this.ROLE_UNAUTHORIZED}, userInfo);
            $(this).triggerHandler('change');
        };        
        
        this.checkUserInfo = function(callback, errorCallback)
        {
            var isTokenUsed = false;
            var _processResponse = function( response )
            {
                var resOk = parseResponse(response);
                
                !resOk && errorCallback && errorCallback();
                    
                if (response.Result == null || !resOk)
                {
					
					if (window.useAccountsAuth){
						var path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
						var redirect_uri = 'http://' + window.location.host + path + '/oAuthCallback.html';
						nsGmx.Utils.login(redirect_uri, serverBase + 'oAuth/', function(userInfo){
							_this.setUserInfo( userInfo || {Login: false});
							resOk && callback && callback();
						}, 'MyKosmosnimki', true);
					}else{
						// юзер не авторизован
						_this.setUserInfo({Login: false});
						resOk && callback && callback();
					}
                    if (isTokenUsed)
                    {
                        //TODO: обработать ошибку
                    }
                }
                else
                {
                    /*//юзер с accounts, там не зарегистрирован, но локально авторизован - надо разлогинеть локально
                    if (!isTokenUsed && response.Result.IsAccounts)
                    {
                        sendCrossDomainJSONRequest(serverBase + "Logout.ashx?WrapStyle=func&WithoutRedirection=1");
                        
                        // юзер не авторизован
                        _this.setUserInfo({Login: false});
                    }
                    else
                    {
                        _this.setUserInfo(response.Result);
                    }*/
					_this.setUserInfo(response.Result);
					resOk && callback && callback();
                }
                
            }
            
            for (var iProvider = 0; iProvider < checkProviders.length; iProvider++)
            {
                if (checkProviders[iProvider].canAuth())
                {
                    checkProviders[iProvider].doAuth(callback, errorCallback);
                    return;
                }
            }
            sendCrossDomainJSONRequest(serverBase + 'User/GetUserInfo.ashx?WrapStyle=func', _processResponse);
            
        }
        
        this.login = function(login, password, callback, errorCallback)
        {
            sendCrossDomainJSONRequest(serverBase + "Login.ashx?WrapStyle=func&login=" + login + "&pass=" + password, function(response)
            {
                if (response.Status == 'ok' && response.Result)
                {
                    if (response.Result.IsAccounts)
                    {
                        //авторизуемся на центральном сервере авторизации
                        sendCrossDomainJSONRequest(window.gmxAuthServer + "Handler/Login?login=" + encodeURIComponent(login) + "&password=" + encodeURIComponent(password), function()
                        {
                            //TODO: check result
                            _this.setUserInfo(response.Result);
                            callback && callback();
                        }, 'callback');
                    }
                    else
                    {
                        _this.setUserInfo(response.Result);
                        callback && callback();
                    }
                }
                else
                {
                    if (response.Status === 'auth' && ('Result' in response) && ('ExceptionType' in response.Result) && response.Result.ExceptionType.indexOf('System.ArgumentException') == 0)
                    {
                        errorCallback && errorCallback({emailWarning: true, message: response.Result.Message})
                    }
                    errorCallback && errorCallback({emailWarning: false});
                }
            });
        }
        
        this.logout = function(callback)
        {
            sendCrossDomainJSONRequest(serverBase + "Logout.ashx?WrapStyle=func&WithoutRedirection=1", function(response)
            {
                if (!parseResponse(response))
                    return;
                    
                if (window.gmxAuthServer)
                {
                    sendCrossDomainJSONRequest(window.gmxAuthServer + "Handler/Logout", function(response)
                    {
                        //TODO: check result
                        _this.setUserInfo({Login: false});
                        callback && callback();
                    }, 'callback');
                }
                else
                {
                    _this.setUserInfo({Login: false});
                    callback && callback();
                }
            });
        }
        
        this.changePassword = function(oldPass, newPass, callback, errorCallback)
        {
            sendCrossDomainJSONRequest(serverBase + "ChangePassword.ashx?WrapStyle=func&old=" + oldPass + "&new=" + newPass, function(response)
            {
                if (response.Status == 'ok' && response.Result)
                    callback && callback();
                else
                {
                    var msg = response.ErrorInfo && typeof response.ErrorInfo.ErrorMessage != 'undefined' ? response.ErrorInfo.ErrorMessage : null;
                    errorCallback && errorCallback(msg);
                }
            });
        }
    }
    
    var checkProviders = [];
    
    //canAuth() -> bool
    //doAuth(callbackSuccess, callbackError)
    nsGmx.AuthManager.addCheckUserMethod = function(provider)
    {
        checkProviders.push(provider);
    }
})(jQuery);