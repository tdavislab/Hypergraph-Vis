class Barcode{
    constructor(barcode_data, linegraph){
        this.barcode = barcode_data.barcode;
        this.linegraph = linegraph;
        console.log(this.barcode)

        this.svg = d3.select("#barcode-svg");
        this.svg_width = parseFloat(d3.select("#vis-barcode").style("width"));
        this.container_height = parseFloat(d3.select("#vis-hypergraph").style("height"));
        this.svg_margin = {'left':12, 'right':20, 'top':10, 'bottom':10};
        this.svg
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width);

        d3.select("#vis-barcode")
            .style("height", d3.select("#vis-hypergraph").style("height"));


        this.barcode_group = this.svg.append("g")
            .attr("id", "barcode_group");
        this.xAxis_group = this.svg.append('g')
            .attr('id','xAxis_group');
        this.slider = this.svg.append('rect')
            .attr('id', 'barcode_slider');
        
        this.draw_barcode();
        this.linegraph.graph_contraction([])
    }

    draw_barcode(){
        let max_death = d3.max(this.barcode.map(d => d.death));
        let width_scale = d3.scaleLinear()
            .domain([0, max_death*1.1])
            .range([0, this.svg_width-this.svg_margin.right-this.svg_margin.left]).nice();
        
        // let barcode_height = Math.floor((this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length);

        let barcode_height = 10;
        this.svg_height = barcode_height * (this.barcode.length+1) + this.svg_margin.top + this.svg_margin.bottom;
        this.svg.attr("height", this.svg_height);

        this.svg.attr("transform", "translate(0,"+(this.container_height-this.svg_height)/3+")");

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
            .attr("class", "barcode-rect-dim0")
            .classed("hover-darken", true);

        let xAxis = d3.axisBottom(width_scale).ticks(5);
        this.xAxis_group
            .classed("axis", true)
            .style("font-size","10px")
            .style("color","dimgray")
            .attr("transform", "translate("+this.svg_margin.left+","+ (this.svg_height-this.svg_margin.bottom-this.svg_margin.top) + ")")
            .call(xAxis);

        this.slider
            .attr("width", 8)
            .attr("height", this.svg_height-this.svg_margin.bottom*2.5)
            .attr("x",this.svg_margin.left+20)
            .attr("y",5)
            .attr("class", "slider hover-darken")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        let that = this;
        function dragstarted() {
            d3.select(this).raise();
        }
        function dragged() {
            d3.select(this).attr("x", clamp(d3.event.x, that.svg_margin.left, width_scale(max_death*1.1)));
                // let destination_position = d3.event.x - d3.select(this).attr("width") / 2;
                // d3.select(this).attr("x", clamp(destination_position, 5, 90));
        }

        function dragended() {
            let bars = that.extract_bars(width_scale.invert(d3.event.x));
            // if(bars.length > 0){
                that.linegraph.graph_contraction(bars);
            // }

        }

        function clamp(d, min, max) {
            return Math.min(Math.max(d, min), max);
        };
        
        

    }

    extract_bars(threshold){
        // extract bars with persistence < threshold
        console.log(threshold)
        let bars = [];
        for(let i=0; i<this.barcode.length-1; i++){
            let bar = this.barcode[i];
            if(bar.death < threshold && bar.death > 0){
                bars.push(bar);
            } 
        }
        return bars;


    }

    createId(id){
        return id.replace(/[^a-zA-Z0-9]/g, "")
    }
    
}