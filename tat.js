class GroupUI {
    constructor(items, x, y) {
        this.items = items;
        this.x = x;
        this.y = y;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        for (const item of this.items) {
            item.draw(ctx);
        }
        ctx.restore();
    }
}
class XYRectUI {
    constructor(x1, y1, x2, y2, fill) {
        this.x = x1;
        this.y = y1;
        this.w = x2 - x1;
        this.h = y2 - y1;
        this.fill = fill;
    }

    draw(ctx) {
        ctx.fillStyle = this.fill;
        const h = this.h == 0 ? 1 : this.h;
        ctx.fillRect(this.x, this.y, this.w, h)
    }
}

class VLineUI {
    constructor(x, y1, y2, stroke) {
        this.x = x;
        this.y1 = y1;
        this.y2 = y2;
        this.stroke = stroke;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y1);
        ctx.lineTo(this.x, this.y2);
        ctx.strokeStyle = this.stroke;
        ctx.stroke();
    }
}

class CrosshairUI {
    constructor(x, y, cx, cy, w, h, style) {
        this.x = x;
        this.y = y;

        this.cx = cx;
        this.cy = cy;

        this.w = w;
        this.h = h;

        this.style = style;
    }

    draw(ctx) {
        ctx.save();
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.cy);
        ctx.lineTo(this.x + this.w, this.cy)
        ctx.moveTo(this.cx, 0);
        ctx.lineTo(this.cx, this.h);
        ctx.strokeStyle = this.style;
        ctx.stroke();
        ctx.restore();
    }
}

class Candle {
    constructor(low, high, open, close) {
        this.low = low;
        this.high = high;
        this.open = open;
        this.close = close;
    }
}

class Chart {
    constructor(e) {
        this.e = e;
        this.ctx = this.e.getContext("2d");

        this.w = this.e.width;
        this.h = this.e.height;

        this.start_x = 0;
        this.candle_width = 1;
        this.ui = [];
        this.attached = null;
        this.cursor = null;

        e.addEventListener("wheel", ev => {
            ev.preventDefault();

            const max_width = 50;
            const min_width = 0.1;

            let delta = -Math.sign(ev.deltaY) * 0.15;

            const factor = this.start_x / this.candle_width;

            this.candle_width = Math.min(max_width, Math.max(min_width, this.candle_width + delta));
            this.start_x = this.candle_width * factor;

            this.redraw();
        }, {passive: false});

        e.onmousemove = ev => {
            if (ev.clientX >= this.canvas_x1 && ev.clientX <= this.canvas_x2) {
                if (ev.buttons == 1) {
                    e.style.cursor = "grabbing";
                    if (this.change_start_x(-ev.movementX)) {
                        this.redraw();
                    }
                } else {
                    e.style.cursor = "crosshair";
                }

                this.cursor = { x: ev.clientX, y: ev.clientY };
            } else {
                if(ev.clientX > this.canvas_x2) {
                    e.style.cursor = "ns-resize";
                } else {
                    e.style.cursor = "pointer";
                }
                this.cursor = null;
            }

            this.redraw();
        }

        e.onmouseleave = ev => {
            this.resetCursor();
            this.redraw();
        }

        this.redraw();
    }

    resetCursor() {
        this.cursor = null;
    }

    redraw() {
        const ctx = this.ctx;

        const label_h = 12;
        ctx.font = label_h + 'px Consolas';
        const label_size = ctx.measureText(max);
        const label_w = label_size.width;

        this.canvas_w = this.w - label_w - 6;
        this.canvas_h = this.h;

        const canvas_w = this.canvas_w;
        const canvas_h = this.canvas_h;

        this.canvas_x1 = 0;
        this.canvas_x2 = this.canvas_x1 + canvas_w;

        const canvas_x1 = this.canvas_x1;
        const canvas_x2 = this.canvas_x2;

        var min = null;
        var max = null;

        let items = result;

        var candles = [];

        for (const item of items) {
            const candle = new Candle(item.low, item.high, item.open, item.close);
            candles.push(candle);
        }

        candles.reverse();

        const initial_x = canvas_x1 + canvas_w - this.candle_width / 2;

        {
            let x = initial_x;

            for (const item of candles) {
                if (x - this.candle_width / 2 < this.w && x + this.candle_width / 2 > canvas_x1) {
                    if (min == null || item.low < min) {
                        min = item.low;
                    }

                    if (max == null || item.high > max) {
                        max = item.high;
                    }
                }

                x -= this.candle_width;
            }
        }

        min -= Math.round((max - min) * 0.05);
        max += Math.round((max - min) * 0.05);

        const delta_y = max - min;
        const top = max;
        const bottom = min;
        const price_per_px = delta_y / canvas_h;

        const candle_ui = [];

        {
            function getFill(open, close) {
                if (open > close) {
                    return "#EF5350";
                } else {
                    return "#26A69A";
                }
            }

            let x = initial_x;

            for (const item of candles) {

                const fill = getFill(item.open, item.close);

                let y1 = canvas_h - (item.open - bottom) / price_per_px;
                let y2 = canvas_h - (item.close - bottom) / price_per_px;

                const rect = new XYRectUI(
                    x - this.candle_width / 2 + 1, y1,
                    x + this.candle_width / 2 - 1, y2,
                    fill
                );

                candle_ui.push(rect);

                const line = new VLineUI(
                    x,
                    canvas_h - (item.low - bottom) / price_per_px, canvas_h - (item.high - bottom) / price_per_px,
                    fill
                );

                candle_ui.push(line);

                x -= this.candle_width;
            }
        }

        let ui = [];

        ui.push(new XYRectUI(0, 0, canvas_w, canvas_h, "#asd"));
        ui.push(new GroupUI(candle_ui, -this.start_x, 0));

        if (this.cursor != null) {
            const index = Math.floor((canvas_x2 - this.cursor.x - this.start_x) / this.candle_width) + 1;
            const x = canvas_x2 - index * this.candle_width - this.start_x + this.candle_width / 2;

            const crosshair = new CrosshairUI(
                canvas_x1, 0,
                x, this.cursor.y,
                canvas_w, canvas_h, "#ccc");

            ui.push(crosshair)
        }

        this.ui = ui;

        ctx.fillStyle = "#151B27";
        ctx.fillRect(0, 0, this.w, canvas_h);

        ctx.save();
        ctx.beginPath()
        ctx.rect(canvas_x1, 0, canvas_w, canvas_h);
        ctx.clip();

        for (const item of ui) {
            item.draw(ctx);
        }

        ctx.restore();

        const y_axis_x = canvas_x1 + canvas_w;
        const price_x = y_axis_x + 8;

        ctx.fillStyle = "#000";

        function getPriceFromY(y) {
            return Math.round(top - y * price_per_px);
        }

        {
            const d = this.h * 0.1;
            for (let y = 0; y <= this.h; y += d) {
                const price = getPriceFromY(y);

                ctx.fillStyle = "#aaa";
                ctx.fillText(price, price_x, y + 4);

                ctx.beginPath();
                ctx.moveTo(y_axis_x + 4, y)
                ctx.lineTo(-canvas_w, y);
                ctx.strokeStyle = "#ffffff22";
                ctx.stroke();
            }

            if (this.cursor != null) {
                const price = getPriceFromY(this.cursor.y);
                ctx.fillStyle = "#333";
                ctx.fillRect(price_x - 4, this.cursor.y - label_h * 1.5, label_w, label_h * 2);
                ctx.fillStyle = "#aaa";
                ctx.fillText(price, price_x, this.cursor.y);
            }
        }

        ctx.beginPath();
        ctx.rect(canvas_x1, 0, canvas_w, this.h);
        ctx.stroke();
    }

    change_start_x(delta) {
        const new_start_x = Math.max(-this.w, this.start_x + delta);

        if (new_start_x == this.start_x) {
            return false;
        }

        this.start_x = new_start_x;
        return true;
    }
}