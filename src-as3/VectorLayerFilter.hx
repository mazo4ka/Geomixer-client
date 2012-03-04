import flash.display.Sprite;
import flash.events.Event;
import flash.events.MouseEvent;
import flash.utils.Timer;
import flash.events.TimerEvent;

class VectorLayerFilter extends MapContent
{
	public var criterion:Hash<String>->Bool;
	public var loadedTiles:Array<VectorTile>;
	public var painters:Array<VectorTilePainter>;
	public var tilesSprite:Sprite;
	public var loader:Extent->Void;
	public var layer:VectorLayer;
	public var ids:Hash<Bool>;

	public var clusterAttr:Dynamic;
	public var regularStyleOrig:Style;
	public var hoverStyleOrig:Style;
	public var paintersHash:Hash<VectorTilePainter>;	// Хэш отрисовщиков тайлов данного фильтра

	public function new(criterion_:Hash<String>->Bool)
	{
		criterion = criterion_;
		flush();
	}

	public override function createContentSprite()
	{
		return Utils.addSprite(mapNode.vectorSprite);
	}

	public override function flush()
	{
		if (painters != null)
			for (painter in painters)
				painter.remove();
		loadedTiles = new Array<VectorTile>();
		painters = new Array<VectorTilePainter>();
		paintersHash = new Hash<VectorTilePainter>();
		ids = new Hash<Bool>();
		if (layer != null)
			createLoader();
		delClusters();
	}

	// Удалить кластеризацию на фильтре
	public override function delClusters():Dynamic
	{
		clusterAttr = null;
		//if(regularStyleOrig != null) mapNode.setStyle(regularStyleOrig, hoverStyleOrig);
		Main.needRefreshMap = true;
	}

	// Проверка кластеризации на фильтре
	public function chkClusters()
	{
		if(clusterAttr != null) runClusters(clusterAttr);
	}

	// Инициализация кластеризации на фильтре
	private function runClusters(attr:Dynamic)
	{
		if(attr != null) clusterAttr = attr;
		var regularStyle = null;
		if (clusterAttr.RenderStyle != null) clusterAttr.regularStyle = new Style(clusterAttr.RenderStyle);
		var hoverStyle = null;
		if (clusterAttr.HoverStyle != null) clusterAttr.hoverStyle = new Style(clusterAttr.HoverStyle);

		clusterAttr._zoomDisabledHash = new Hash<Bool>();
		if (clusterAttr.zoomDisabled != null) {
			for (i in 0...Std.int(clusterAttr.zoomDisabled.length))
			{
				clusterAttr._zoomDisabledHash.set(clusterAttr.zoomDisabled[i], true);
			}
		}
		
		Main.needRefreshMap = true;
		if(regularStyleOrig == null) regularStyleOrig = mapNode.regularStyle;
		if(hoverStyleOrig == null) hoverStyleOrig = mapNode.hoveredStyle;
		//mapNode.setStyle(clusterAttr.regularStyle, clusterAttr.hoverStyle);
	}

	// Установить кластеризацию на фильтре
	public override function setClusters(attr:Dynamic):Dynamic
	{
		var me = this;
		if(mapNode.regularStyle == null) {
			var timer:Timer = new Timer(20);
			timer.addEventListener("timer", function(e:TimerEvent)
			{
				if (me.mapNode.regularStyle != null) {
					timer.stop();
					timer = null;
					me.runClusters(attr);
				}
			});
			timer.start();
		} else
		{
			runClusters(attr);
		}
		return true;
	}

	function createLoader()
	{
		var me = this;
		loader = layer.createLoader(function(tile:VectorTile, tilesRemaining:Int)
		{
			me.loadedTiles.push(tile);
			var tileGeometry = new MultiGeometry();
			for (i in 0...tile.geometries.length)
			{
				var geom = tile.geometries[i];
				if (me.layer.temporalCriterion != null && !me.layer.temporalCriterion(geom.propTemporal)) {
					continue;
				}
				if (me.criterion(geom.properties))
				{
					me.ids.set(tile.ids[i], true);
					tileGeometry.addMember(geom);
				}
			}
			
			var window = me.mapNode.window;
			var painter = new VectorTilePainter(tileGeometry, me, tile);
			me.painters.push(painter);
			me.paintersHash.set(tile.z+'_'+tile.i+'_'+tile.j, painter);

			painter.repaint(me.mapNode.getRegularStyle());

			if (tilesRemaining == 0)
			{
				window.cacheRepaintNeeded = true;
				var style = me.mapNode.regularStyle;
				if ((style != null) && (style.label != null))
					window.labelsRepaintNeeded = true;
				for (child in me.layer.mapNode.children)
					if (Std.is(child.content, VectorLayerObserver))
						child.noteSomethingHasChanged();
				Main.needRefreshMap = true;		// Для обновления карты
				//Main.refreshMap();
			}
		});
	}

	public override function repaint()
	{
		if(loader != null) loader(mapNode.window.visibleExtent);
		var w = 2 * Utils.worldWidth;
		var e1 = mapNode.window.visibleExtent;
		var cx1 = (e1.minx + e1.maxx) / 2;
		var curStyle = mapNode.getRegularStyle();

		if(clusterAttr != null) {
			var currentZ:Int = Std.int(mapNode.window.getCurrentZ());
			if (!clusterAttr._zoomDisabledHash.exists(currentZ)) {
				curStyle = clusterAttr.regularStyle;
				//curStyle = regularStyleOrig;
			}
		}

		for (painter in painters)
		{
			painter.repaint(curStyle);
			var e2 = painter.painter.geometry.extent;
			var cx2 = (e2.minx + e2.maxx)/2;
			var d1 = Math.abs(cx2 - cx1 - w);
			var d2 = Math.abs(cx2 - cx1);
			var d3 = Math.abs(cx2 - cx1 + w);
			if ((d1 <= d2) && (d1 <= d3))
				painter.setOffset(-w);
			else if ((d2 <= d1) && (d2 <= d3))
				painter.setOffset(0);
			else if ((d3 <= d1) && (d3 <= d2))
				painter.setOffset(w);
		}
	}

	public override function hasLabels()
	{
		var style = (mapNode != null ? mapNode.getRegularStyle() : null);
		return ((style != null) && (style.label != null));
	}

	public override function paintLabels()
	{
		if (hasLabels())
		{
			var style = mapNode.getRegularStyle();
			var window = mapNode.window;
			var idsAlreadyPainted = new Hash<Bool>();
			var e1 = window.visibleExtent;
			var currentZ:Int = Std.int(window.getCurrentZ());
	
			for (key in paintersHash.keys())
			{
				var tPainter = paintersHash.get(key);
				var curGeom:MultiGeometry = (clusterAttr == null || clusterAttr._zoomDisabledHash.exists(currentZ) ? tPainter.tileGeometry : tPainter.clustersGeometry);
				if(curGeom != null) {
					for (member in curGeom.members)
					{
						var id = member.properties.get(layer.identityField);
						if (!idsAlreadyPainted.exists(id))
						{
							window.paintLabel(
								member.properties.get(style.label.field),
								member,
								style
							);
							idsAlreadyPainted.set(id, true);
						}
					}
				}
			}
		}
	}

	public override function addHandlers()
	{
		layer = cast(mapNode.parent.content, VectorLayer);
		createLoader();
		tilesSprite = Utils.addSprite(contentSprite);

		var me = this;
		contentSprite.addEventListener(MouseEvent.MOUSE_DOWN, function(event:MouseEvent)
		{
			if (me.layer.currentFilter != null)
				Main.registerMouseDown(me.layer.currentFilter.mapNode, event, null);
		});
		contentSprite.addEventListener(MouseEvent.MOUSE_MOVE, function(event:Event)
		{
			me.layer.repaintIndicator();
		});
		var roll_out = function(event:Event)
		{
			if (me.layer.currentFilter != null)
			{
				var node = me.layer.currentFilter.mapNode;
				node.callHandler("onMouseOut");
			}
			me.layer.hoverPainter.repaint(null);
			me.layer.currentId = null;
			me.layer.currentFilter = null;
		};
		contentSprite.addEventListener(MouseEvent.ROLL_OUT, roll_out);
		flash.Lib.current.stage.addEventListener(Event.MOUSE_LEAVE, roll_out);
	
	}
}
