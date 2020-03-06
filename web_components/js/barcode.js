class Barcode{
    constructor(barcode_data){
        this.barcode = barcode_data.barcode;
        console.log(this.barcode)

        this.svg = d3.select("#barcode-svg");
        this.svg_width = parseFloat(this.svg.style("width"));
        this.svg_height = parseFloat(this.svg.style("height"));
        this.svg_margin = {'left':10, 'right':10, 'top':10, 'bottom':10};
        this.svg.attr("viewBox", [0, 0, this.svg_width, this.svg_height]);


        this.barcode_group = this.svg.append("g")
            .attr("id", "barcode_group");
        
        this.draw_barcode();
    }

    draw_barcode(){
        let max_death = d3.max(this.barcode.map(d => d.death));
        let width_scale = d3.scaleLinear()
            .domain([0, max_death*1.1])
            .range([this.svg_margin.left, this.svg_width-this.svg_margin.right]).nice();
        
        let barcode_height = (this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length;

        let bg = this.barcode_group.selectAll('rect').data(this.barcode);
        bg.exit().remove();
        bg = bg.enter().append('rect').merge(bg)
            .attr('width', d=>{
                if(d.death > 0){
                    return width_scale(d.death - d.birth);
                } else {
                    return width_scale(max_death*1.1);
                }
            })
            .attr('height', barcode_height)
            .attr('x', this.svg_margin.left)
            .attr('y', (d, i)=>this.svg_margin.top + i*barcode_height)
            .attr("class", d => "barcode-rect-dim0")
            .classed("hover-darken", true);
    }

    
}