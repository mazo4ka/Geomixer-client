import flash.display.Sprite;

class GeometryPainter
{
	public var sprite:Sprite;
	public var window:MapWindow;
	public var geometry:Geometry;

	
	public function new(geometry_:Geometry, sprite_:Sprite, window_:MapWindow)
	{
		geometry = geometry_;
		sprite = sprite_;
		window = window_;
	}

	public function repaint(style:Style)
	{
		//sprite.graphics.clear();
		Utils.clearSprite(sprite);
		if ((geometry != null) && (style != null))
			geometry.paintWithExtent(sprite, style, window);
	}

	public function repaintWithoutExtent(style:Style, sprite_:Sprite)
	{
		if (sprite_ == null) sprite_ = sprite;
		Utils.clearSprite(sprite_);
		//sprite_.graphics.clear();
		if ((geometry != null) && (style != null))
			geometry.paint(sprite_, style, window);
	}
}
