﻿!function($){
    _translationsHash.addtext("rus", {
        "LayerRCControl.minZoom"         : "Мин. зум",
        "LayerRCControl.titleTemplate"   : "Шаблон имени",
        "LayerRCControl.pathTemplate"    : "Шаблон тайлов",
        "LayerRCControl.advancedLink"    : "Дополнительные параметры",
        "LayerRCControl.layerTagTitle"   : "Параметр слоя",
        "LayerRCControl.attributeTitle"  : "Атрибут объекта"
    });
    
    _translationsHash.addtext("eng", {
        "LayerRCControl.minZoom"         : "Min zoom",
        "LayerRCControl.titleTemplate"   : "Title template",
        "LayerRCControl.pathTemplate"    : "Path template",
        "LayerRCControl.advancedLink"    : "Advanced parameters",
        "LayerRCControl.layerTagTitle"   : "Layer parameter",
        "LayerRCControl.attributeTitle"  : "Object Attribute"
    });
    
    nsGmx.LayerRCProperties = Backbone.Model.extend({
        defaults: {
            IsRasterCatalog: false,
            RCMinZoomForRasters: 0,
            RCMaskForRasterTitle: '',
            RCMaskForRasterPath: '',
            ColumnTagLinks: {}
        },
        isAnyLinks: function() {
            return nsGmx._.size(this.attributes.ColumnTagLinks) > 0;
        }
    });

    /**
    Контрол для задания параметров каталогов растров
    @memberOf nsGmx
    @class
    */
    nsGmx.LayerRasterCatalogControl = function(container, rcProperties, params)
    {
        var advancedMode = !!(rcProperties.get('RCMaskForRasterPath') || rcProperties.get('RCMaskForRasterTitle') || rcProperties.isAnyLinks());
        
        var updateVisibility = function()
        {
            var isRasterCatalog = rcProperties.get('IsRasterCatalog');
            $('.RCCreate-advanced', container).toggle(advancedMode);
            $('.RCCreate-advanced-link, .RCCreate-params', container).toggle(isRasterCatalog);
            $('.RCCreate-tagContainer', container).toggle(advancedMode && isRasterCatalog);
        }
        
        rcProperties.on('change:IsRasterCatalog', updateVisibility);
        
        var RCCheckbox = $('<input/>', {type: 'checkbox', 'class': 'RCCreate-checkbox'}).change(function() {
            rcProperties.set( 'IsRasterCatalog', RCCheckbox[0].checked );
        });

        var advancedParamsLink = $(makeLinkButton(_gtxt('LayerRCControl.advancedLink'))).addClass('RCCreate-advanced-link').click(function()
        {
            advancedMode = !advancedMode;
            updateVisibility();
        });
        
        var RCHeader = $('<div/>', {'class': 'RCCreate-header'}).append(advancedParamsLink, RCCheckbox).appendTo(container);
        
        RCCheckbox[0].checked = rcProperties.get('IsRasterCatalog');
        
        var minZoomInput = $('<input/>', {'class': 'inputStyle RCCreate-zoom-input'}).val(rcProperties.get('RCMinZoomForRasters') || '');
        var titleInput = $('<input/>', {'class': 'inputStyle'}).val(rcProperties.get('RCMaskForRasterTitle') || '');
        var pathInput = $('<input/>', {'class': 'inputStyle'}).val(rcProperties.get('RCMaskForRasterPath') || '');
        
        var RCParamsTable = 
            $('<table/>', {'class': 'RCCreate-params'})
                .append($('<tr/>')
                    .append($('<td/>').text(_gtxt('LayerRCControl.minZoom')).css('padding-right', '6px'))
                    .append($('<td/>').append(minZoomInput)))
                .append($('<tr/>', {'class': 'RCCreate-advanced'})
                    .append($('<td/>').text(_gtxt('LayerRCControl.titleTemplate')))
                    .append($('<td/>').append(titleInput)))
                .append($('<tr/>', {'class': 'RCCreate-advanced'})
                    .append($('<td/>').text(_gtxt('LayerRCControl.pathTemplate')))
                    .append($('<td/>').append(pathInput)))
                .appendTo(container);
        
        var layerTags;
        nsGmx.TagMetaInfo.loadFromServer(function(realTagInfo)
        {
            var realTagsInfo = realTagInfo.getTagArrayExt();
            var fakeTagsInfo = {};
            for (var iT = 0; iT < realTagsInfo.length; iT++)
            {
                var info = realTagsInfo[iT];
                fakeTagsInfo[info.name] = {Type: 'String', Description: info.descr};
            }
            var fakeTagManager = new nsGmx.TagMetaInfo(fakeTagsInfo);
            
            var initTags = {};
            
            var columnTagLinks = rcProperties.get('ColumnTagLinks');
            
            for (var iP in columnTagLinks)
                initTags[columnTagLinks[iP]] = {Value: iP};
            
            layerTags = new nsGmx.LayerTags(fakeTagManager, initTags);
            
            var tagContainer = $('<div/>', {'class': 'RCCreate-tagContainer RCCreate-advanced'}).addClass().appendTo(container);
            var tagsControl = new nsGmx.LayerTagSearchControl(layerTags, tagContainer, {
                inputWidth: 100, 
                tagHeader: _gtxt('LayerRCControl.layerTagTitle'), 
                valueHeader: _gtxt('LayerRCControl.attributeTitle')
            });
            
            $(layerTags).change(function() {
                var columnTagLinks = {};
                layerTags.eachValid(function(id, tag, value) { columnTagLinks[value] = tag;});
                rcProperties.set('ColumnTagLinks', columnTagLinks);
            })
            
            updateVisibility();
        })
    }
}(jQuery)