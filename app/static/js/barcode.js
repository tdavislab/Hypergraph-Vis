class Barcode{
    constructor(barcode_data, linegraph){
        this.barcode = barcode_data;
        this.linegraph = linegraph;
        console.log(this.barcode)

        this.svg = d3.select("#barcode-svg");
        this.svg_width = parseFloat(d3.select("#vis-barcode").style("width"));
        this.container_height = parseFloat(d3.select("#vis-hypergraph").style("height"))*2;
        this.svg_margin = {'left':12, 'right':20, 'top':10, 'bottom':10};
        this.svg
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width);

        d3.select("#vis-barcode")
            // .style("height", d3.select("#vis-hypergraph").style("height"));
            .style("height", parseInt(this.container_height)+"px");


        this.barcode_group = this.svg.append("g")
            .attr("id", "barcode_group");
        this.xAxis_group = this.svg.append('g')
            .attr('id','xAxis_group');
        this.slider = this.svg.append('rect')
            .attr('id', 'barcode_slider');
        
        this.draw_barcode();

        let connected_components = [];
        this.linegraph.nodes.forEach(n=>{
            connected_components.push([n.id]);
        })

        this.threshold = 0;
        this.cc_dict = this.linegraph.graph_contraction(undefined)
        // console.log(this.connected_components)
        // this.linegraph.compute_simplified_hypergraph(connected_components);
    }

    draw_barcode(){
        this.max_death = d3.max(this.barcode.map(d => d.death));
        this.width_scale = d3.scaleLinear()
            .domain([0, this.max_death*1.1])
            .range([0, this.svg_width-this.svg_margin.right-this.svg_margin.left]).nice();
        
        // let barcode_height = Math.floor((this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length);

        let barcode_height = 10;
        this.svg_height = barcode_height * (this.barcode.length+1) + this.svg_margin.top + this.svg_margin.bottom;
        this.svg.attr("height", this.svg_height);

        if(this.svg_height < this.container_height){
            this.svg.attr("transform", "translate(0,"+(this.container_height-this.svg_height)/3+")");
        }
        

        let bg = this.barcode_group.selectAll('rect').data(this.barcode);
        bg.exit().remove();
        bg = bg.enter().append('rect').merge(bg)
            .attr('width', d=>{
                if(d.death > 0){
                    return this.width_scale(d.death - d.birth);
                } else {
                    return this.width_scale(this.max_death*1.1);
                }
            })
            .attr('height', barcode_height)
            .attr('x', this.svg_margin.left)
            .attr('y', (d, i)=>this.svg_margin.top + i*barcode_height)
            .attr("class", "barcode-rect-dim0")
            .classed("hover-darken", true)
            // .on("click", d=>{
            //     console.log(d)
            //     // let edge_id = d.edge.source+"-"+d.edge.target;
            //     if(d.death > 0){
            //         // this.linegraph.graph_expansion(d);
            //     }
            // });

        let xAxis = d3.axisBottom(this.width_scale).ticks(5);
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
            .attr("id", "barcode-slider")
    }

    extract_edgeid(threshold){
        // find out the longest bar with length < threshold
        let edgeid;
        for(let i=0; i<this.barcode.length; i++){
            let bar = this.barcode[i];
            if(bar.death > 0){
                let next_bar = this.barcode[i+1];
                let bar_length = bar.death - bar.birth;
                let next_bar_length = next_bar.death - next_bar.birth;
                if(bar_length <= threshold && next_bar_length > threshold){
                    edgeid = bar.edge.source+"-"+bar.edge.target;
                    break;
                } else if(bar_length <= threshold && next_bar.death < 0){
                    edgeid = bar.edge.source+"-"+bar.edge.target;
                }
            }
        }
        return edgeid;
    }
    
}