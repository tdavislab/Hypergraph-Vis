class Barcode{
    constructor(barcode_data, linegraph){
        this.barcode = barcode_data.barcode;
        this.linegraph = linegraph;
        console.log(this.barcode)

        this.svg = d3.select("#barcode-svg");
        this.svg_width = parseFloat(this.svg.style("width"));
        this.svg_height = parseFloat(this.svg.style("height"));
        this.svg_margin = {'left':10, 'right':10, 'top':10, 'bottom':10};
        this.svg.attr("viewBox", [0, 0, this.svg_width, this.svg_height]);


        this.barcode_group = this.svg.append("g")
            .attr("id", "barcode_group");
        this.xAxis_group = this.svg.append('g')
            .attr('id','xAxis_group');
        this.slider = this.svg.append('rect')
            .attr('id', 'barcode_slider');
        
        this.draw_barcode();
    }

    draw_barcode(){
        let max_death = d3.max(this.barcode.map(d => d.death));
        let width_scale = d3.scaleLinear()
            .domain([0, max_death*1.1])
            .range([this.svg_margin.left, this.svg_width-this.svg_margin.right]).nice();
        
        let barcode_height = Math.floor((this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length);

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

        let xAxis = d3.axisBottom(width_scale);
        this.xAxis_group
            .classed("axis", true)
            .style("font-size","10px")
            .style("color","dimgray")
            .attr("transform", "translate(0, "+ (this.svg_height-this.svg_margin.bottom-this.svg_margin.top) + ")")
            .call(xAxis);

        this.slider
            .attr("width", 8)
            .attr("height", this.svg_height)
            .attr("x",this.svg_width-20)
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
            that.graph_contraction(width_scale.invert(d3.event.x));

        }

        function clamp(d, min, max) {
            return Math.min(Math.max(d, min), max);
        };
        
        

    }

    graph_contraction(threshold){
        console.log(threshold)
        for(let i=0; i<this.barcode.length-1; i++){
            let bar = this.barcode[i];
            let link_id = this.createId(bar.edge.source)+"-"+this.createId(bar.edge.target);
            // console.log(bar.death)
            if(bar.death < threshold && bar.death > 0){
                this.linegraph.links_dict[link_id].distance = 10;
                console.log(link_id)

                // d3.select(link_id)
                //     .style("visibility", "visible");
                // // contraction
                // console.log(d3.select(source_id).node())
                
                // d3.select(source_id).data()[0].vx = d3.select(source_id).data()[0].vx * 3
                // d3.select(source_id).data()[0].vy = d3.select(source_id).data()[0].vy * 3
                // d3.select(source_id)
                //     .attr("cx", d => d.x - d.vx*10)
                //     .attr("cy", d => d.y - d.vy*10)
            } else {
                this.linegraph.links_dict[link_id].distance = 100;
                // d3.select(link_id)
                //     .style("visibility", "hidden");
            }
        }
        this.linegraph.simulation.force("link", d3.forceLink(this.linegraph.links).distance(d => d.distance).id(d => d.id))
        this.linegraph.simulation.alpha(1).restart()


    }

    createId(id){
        return id.replace(/[^a-zA-Z0-9]/g, "")
    }
    
}