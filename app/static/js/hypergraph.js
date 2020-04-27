class Hypergraph {
    constructor(hyper_data, svg_id, config, original_hgraph = undefined) {
        this.nodes = hyper_data.nodes;
        this.links = hyper_data.links;
        this.svg_id = svg_id;
        this.original_hgraph = original_hgraph;
        this.config = config;

        console.log(this.links, this.nodes)

        this.nodes_dict = {};
        this.nodes.forEach(node => {
            node.links_idx = {"source": [], "target": []};
            this.nodes_dict[node.id] = node;
        })

        for (let i = 0; i < this.links.length; i++) {
            let l = this.links[i];
            this.nodes_dict[l.source].links_idx.source.push(i);
            this.nodes_dict[l.target].links_idx.target.push(i);
        }

        this.container_width = parseFloat(d3.select('#vis-' + svg_id).style('width'));
        let window_height = window.innerHeight;
        let header_height = d3.select(".header-group").node().offsetHeight;

        this.svg_width = this.container_width;
        this.svg_height = (window_height - header_height) / 2 - 30;

        this.svg = d3.select("#" + svg_id + "-svg")
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "hyper_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "hyper_nodes_group");

        this.radius_scale = d3.scaleLinear().domain([1, 8]).range([8, 15]);

        this.draw_hypergraph();
        this.toggle_hgraph_labels();
    }

    groupPath(vertices) {
        console.log(vertices)
        // not draw convex hull if vertices.length <= 1
        if (vertices.length >= 2) {
            if (vertices.length === 2) {
                let fake_point1 = vertices[0];
                let fake_point2 = vertices[1];
                vertices.push(fake_point1, fake_point2);
            }
            return "M" + d3.polygonHull(vertices).join("L") + "Z";
        }
    }

    get_node_radius(node_id) {
        let n_list = node_id.split("|");
        if (n_list.length > 1) {
            n_list.pop();
        }
        return this.radius_scale(Math.min(n_list.length, 8));
    }

    get_graph_coordinates() {
        let coordinates = {};
        this.nodes.forEach(node => {
            coordinates[node.id] = {"x": node.x, "y": node.y}
            // console.log(node.x)
            // this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")
            if (node.bipartite === 1) {
                coordinates[node.id].hull = d3.select("#" + this.svg_id + "-hull-" + node.id.replace(/[|]/g, "")).attr("d")
            }
        })
        return coordinates;
    }

    recover_graph_coordinates(coordinates) {
        // this.nodes.forEach(node=>{
        //     if(coordinates[node.id]){
        //         // d3.select("#"+this.svg+"-node-"+node.id.replace(/[|]/g,""))
        //     }
        // })
        this.nodes_group.selectAll("g")
            .attr("transform", d => {
                if (coordinates[d.id]) {
                    d.x = coordinates[d.id].x;
                    d.y = coordinates[d.id].y;
                    // return "translate("+coordinates[d.id].x+","+coordinates[d.id].y+")";
                }
                // else{
                return "translate(" + d.x + "," + d.y + ")";
                // }
            });
        this.links_group.selectAll("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        let groups = d3.nest()
            .key(d => d.source.id)
            .rollup(d => d.map(node => [node.target.x, node.target.y]))
            .entries(this.links);
        let groups_dict = {};
        groups.forEach(g => {
            groups_dict[g.key] = g.value;
        })
        this.svg.select("#hull-group").selectAll("path").attr("d", d => {
            if (coordinates[d.key]) {
                return coordinates[d.key].hull
            } else {
                return this.groupPath(groups_dict[d.key])

            }
        });

    }

    draw_hypergraph() {
        // let node_radius = 8;
        let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;

        let simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.id))
            .force("charge", d3.forceManyBody(-500))
            .force("center", d3.forceCenter(this.svg_width / 2, this.svg_height / 2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            .stop();
        simulation.tick(300);

        this.nodes.forEach(node => {
            node.x0 = node.x;
            node.y0 = node.y;
        })

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng)
            .attr("id", d => this.svg_id + '-nodegroup-' + d.id.replace(/[|]/g, ""));

        ng.append("circle")
            .attr("r", d => this.get_node_radius(d.id))
            .attr("fill", d => d["bipartite"] === 1 ? d.color : "")
            .attr("id", d => this.svg_id + '-node-' + d.id.replace(/[|]/g, ""))
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("class", d => d["bipartite"] === 1 ? "hyper_node" : "vertex_node")
            .classed("grey_out", d => {
                if (singleton_type === "grey_out" && d.if_singleton) {
                    return true;
                } else {
                    return false;
                }
            })
            .on("mouseover", d => mouseover(d.id))
            .on("mouseout", d => mouseout(d.id))
            .on("click", d => {
                if (this.click_id != d.id) {
                    this.click_id = d.id;
                    if (d.bipartite === 1) {
                        click(d.id);
                    } else {
                        click_vertices(d.id);
                    }
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                }
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))

        ng.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("class", "node-label")
            .attr("id", d => this.svg_id + '-text-' + d.id.replace(/[|]/g, ""))
            .text(d => d.label);

        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke-width", d => Math.sqrt(d.value))
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("class", "hyper_edge")
            .attr("id", d => this.svg_id + "-edge-" + d.source.id.replace(/[|]/g, "") + "-" + d.target.id.replace(/[|]/g, ""))

        let links_new = [];
        this.links.forEach(l => {
            links_new.push(l);
        })
        this.nodes.forEach(node => {
            links_new.push({"source": node, "target": node});
        })

        let groups = d3.nest()
            .key(d => d.source.id)
            .rollup(d => d.map(node => [node.target.x, node.target.y]))
            // .entries(this.links);
            .entries(links_new)

        console.log("group", groups)
        // console.log(groups(this.nodes[0].id))

        this.svg.select("g#hull-group").remove();

        let hulls = this.svg.select("g").insert("g", ":first-child")
            .attr("id", "hull-group")
            .selectAll("path")
            .data(groups);

        hulls.enter()
            .insert("path")
            .attr("fill", d => this.nodes_dict[d.key].color)
            .attr("stroke", d => this.nodes_dict[d.key].color)
            .attr("d", d => this.groupPath(d.value))
            .attr("id", d => this.svg_id + "-hull-" + d.key.replace(/[|]/g, ""))
            .attr("class", "convex_hull")
            .classed("grey_out", d => {
                if (singleton_type === "grey_out" && this.nodes_dict[d.key].if_singleton) {
                    return true;
                } else {
                    return false;
                }
            })
            .on("mouseover", d => mouseover(d.key))
            .on("mouseout", d => mouseout(d.key))
            .on("click", d => {
                // if(this.click_id != d.key){
                if (!this.click_id) {
                    this.click_id = d.key;
                    click(d.key)
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                }
                // }
            });

        // // add drag capabilities
        // const drag_handler = d3.drag()
        //     .on("start", drag_start)
        //     .on("drag", drag_drag)
        //     .on("end", drag_end);

        //add zoom capabilities
        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);

        // drag_handler(ng);
        zoom_handler(this.svg);

        // // Drag functions
        // // d is the node
        // function drag_start(d) {
        //     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        //     d.fx = d.x;
        //     d.fy = d.y;
        // }

        // //make sure you can"t drag the circle outside the box
        // function drag_drag(d) {
        //     d.fx = d3.event.x;
        //     d.fy = d3.event.y;
        // }

        // function drag_end(d) {
        //     if (!d3.event.active) simulation.alphaTarget(0);
        //     d.fx = null;
        //     d.fy = null;
        // }

        let that = this;

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            d3.select("#" + that.svg_id + '-node-' + d.id.replace(/[|]/g, "")).attr("cx", d3.event.x).attr("cy", d3.event.y);
            d3.select("#" + that.svg_id + '-text-' + d.id.replace(/[|]/g, "")).attr("x", d3.event.x).attr("y", d3.event.y);


            d.links_idx.source.forEach(l_idx => {
                let l = that.links[l_idx];
                d3.select("#" + that.svg_id + "-edge-" + l.source.id.replace(/[|]/g, "") + "-" + l.target.id.replace(/[|]/g, ""))
                    .attr("x1", d3.event.x).attr("y1", d3.event.y)
                // .attr("x2", l.target.x + d3.event.x - d.x).attr("y2", l.target.y + d3.event.y - d.y);
                // d3.select("#"+that.svg_id+"-node-"+l.target.id.replace(/[|]/g,""))
                //     .attr("cx", l.target.x + d3.event.x - d.x).attr("cy", l.target.y + d3.event.y - d.y);
                // l.target.links_idx.target.forEach(l_idx2 => {
                //     let l2 = that.links[l_idx2];
                //     d3.select("#"+that.svg_id+"-edge-"+l2.source.id.replace(/[|]/g,"")+"-"+l2.target.id.replace(/[|]/g,""))
                //     .attr("x2", l.target.x + d3.event.x - d.x).attr("y2", l.target.y + d3.event.y - d.y);
                // })
            })
            d.links_idx.target.forEach(l_idx => {
                let l = that.links[l_idx];
                d3.select("#" + that.svg_id + "-edge-" + l.source.id.replace(/[|]/g, "") + "-" + l.target.id.replace(/[|]/g, "")).attr("x2", d3.event.x).attr("y2", d3.event.y);
            })
            // d3.select("#"+that.svg_id+"-hull-"+d.id.replace(/[|]/g,""))
            // .attr("transform", "translate("+(d3.event.x-d.x0)+","+(d3.event.y-d.y0)+")")
        }

        function dragended(d) {
            let d_id = d.id;
            d.x = d3.event.x;
            d.y = d3.event.y;

            if (d.bipartite === 1) {
                let d_links = [];
                d_links.push({"source": d, "target": d})
                d.links_idx.source.forEach(l_idx => {
                    d_links.push(that.links[l_idx]);
                })

                let d_groups = d3.nest()
                    .key(d => d.source.id)
                    .rollup(d => d.map(node => [node.target.x, node.target.y]))
                    .entries(d_links);

                d3.select("#" + that.svg_id + "-hull-" + d.id.replace(/[|]/g, "")).attr("d", that.groupPath(d_groups[0].value))

            } else {
                let new_groups = d3.nest()
                    .key(d => d.source.id)
                    .rollup(d => d.map(node => [node.target.x, node.target.y]))
                    .entries(links_new);
                let new_groups_dict = {};
                new_groups.forEach(g => {
                    new_groups_dict[g.key] = g.value;
                })
                d.links_idx.target.forEach(l_idx => {
                    console.log(l_idx)
                    let l = that.links[l_idx];
                    d3.select("#" + that.svg_id + "-hull-" + l.source.id.replace(/[|]/g, "")).attr("d", that.groupPath(new_groups_dict[l.source.id]))
                })
            }
            console.log(d.x, d.y)

        }

        function mouseover(key) {
            if (!that.click_id) {
                let label_list = that.nodes_dict[key].label.split("|")
                let div_text = '';
                label_list.forEach(label => {
                    div_text += label + "<br> ";
                })
                let div = d3.select("#help-tip")
                div.classed("show", true);
                if (that.nodes_dict[key].bipartite === 1) {
                    d3.select("#" + that.svg_id + "-hull-" + key.replace(/[|]/g, "")).classed("highlighted", true);
                    div.html("<h6>Selected Hyperedges</h6>" + div_text);
                } else {
                    d3.select("#" + that.svg_id + "-node-" + key.replace(/[|]/g, "")).classed("highlighted", true);
                    div.html("<h6>Selected Vertices</h6>" + div_text);
                }
            }
        }

        function mouseout(key) {
            if (!that.click_id) {
                d3.select("#" + that.svg_id + "-hull-" + key.replace(/[|]/g, "")).classed("highlighted", false);
                d3.select("#" + that.svg_id + "-node-" + key.replace(/[|]/g, "")).classed("highlighted", false);
                d3.select("#help-tip").classed("show", false);
                // d3.select("#help-tip").transition().duration(200).style("opacity", 0);
            }
        }

        function click(key) {
            let he_list = key.split("|");
            if (he_list.length > 1) {
                he_list.pop();
            }
            // console.log(key)
            d3.select("#hypergraph-svg").selectAll("path").classed("faded", d => {
                if (he_list.indexOf(d.key.split("|")[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#hypergraph-svg").selectAll("circle").classed("faded", d => {
                if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#hypergraph-svg").selectAll("text").classed("faded", d => {
                if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#hypergraph-svg").selectAll("line").data().forEach(l => {
                if (he_list.indexOf(l.source.id.split("|")[0]) != -1) {
                    d3.select("#hypergraph-node-" + l.target.id.replace(/[|]/g, "")).classed("faded", false);
                }
            })

            d3.select("#simplified-hypergraph-svg").selectAll("path").classed("faded", d => {
                if (d.key.split("|").indexOf(he_list[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#simplified-hypergraph-svg").selectAll("circle").classed("faded", d => {
                if (d.id.split("|").indexOf(he_list[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#simplified-hypergraph-svg").selectAll("text").classed("faded", d => {
                if (d.id.split("|").indexOf(he_list[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#simplified-hypergraph-svg").selectAll("line").data().forEach(l => {
                if (l.source.id.split("|").indexOf(he_list[0]) != -1) {
                    d3.select("#simplified-hypergraph-node-" + l.target.id.replace(/[|]/g, "")).classed("faded", false);
                }
            })

            if (that.config.variant === "line_graph") {
                d3.select("#linegraph-svg").selectAll("circle").classed("faded", true);
                d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                        return false;
                    } else {
                        return true;
                    }
                });
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d => {
                    if ((he_list.indexOf(d.source.id.split("|")[0]) != -1) && (he_list.indexOf(d.target.id.split("|")[0]) != -1)) {
                        return false;
                    } else {
                        return true;
                    }
                });
                d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", true);
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                        return false;
                    } else {
                        return true;
                    }
                });
                // At most one node in simplified linegraph will be selected, so all edges will be faded
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", true);
            } else {
                let v_list = [];
                d3.select("#linegraph-svg").selectAll("circle").classed("faded", d => {
                    for (let i = 0; i < d.vertices.length; i++) {
                        if (he_list.indexOf(d.vertices[i]) != -1) {
                            v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    for (let i = 0; i < d.vertices.length; i++) {
                        if (he_list.indexOf(d.vertices[i]) != -1) {
                            v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d => {
                    if (v_list.indexOf(d.source.id) != -1 && v_list.indexOf(d.target.id) != -1) {
                        return false;
                    }
                    return true;
                });
                let s_v_list = [];
                d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", d => {
                    for (let i = 0; i < d.vertices.length; i++) {
                        if (he_list.indexOf(d.vertices[i]) != -1) {
                            s_v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    for (let i = 0; i < d.vertices.length; i++) {
                        if (he_list.indexOf(d.vertices[i]) != -1) {
                            s_v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", d => {
                    if (s_v_list.indexOf(d.source.id) != -1 && s_v_list.indexOf(d.target.id) != -1) {
                        return false;
                    }
                    return true;
                });
            }


            d3.select("#" + that.svg_id + "-hull-" + key.replace(/[|]/g, "")).classed("highlighted", false);
        }

        function click_vertices(key) {
            let he_list = key.split("|");
            if (he_list.length > 1) {
                he_list.pop();
            }
            d3.select("#hypergraph-svg").selectAll("path").classed("faded", true);
            d3.select("#hypergraph-svg").selectAll("circle").classed("faded", d => {
                if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#hypergraph-svg").selectAll("text").classed("faded", d => {
                if (he_list.indexOf(d.id.split("|")[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });


            d3.select("#simplified-hypergraph-svg").selectAll("path").classed("faded", true);
            d3.select("#simplified-hypergraph-svg").selectAll("circle").classed("faded", d => {
                if (d.id.split("|").indexOf(he_list[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });
            d3.select("#simplified-hypergraph-svg").selectAll("text").classed("faded", d => {
                if (d.id.split("|").indexOf(he_list[0]) != -1) {
                    return false;
                } else {
                    return true;
                }
            });

            d3.select("#" + that.svg_id + "-node-" + key.replace(/[|]/g, "")).classed("highlighted", false);
        }

        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }
    }

    cancel_faded() {
        d3.select("#hypergraph-svg").selectAll("path").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll("text").classed("faded", false);

        d3.select("#simplified-hypergraph-svg").selectAll("path").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll("text").classed("faded", false);

        d3.select("#linegraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#linegraph-svg").selectAll("line").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", false);
    }

    toggle_hgraph_labels() {
        try {
            // Set show-labels to true at beginning
            // d3.select("#hgraph-labels").property("checked", true);
            update_labels();
            d3.select("#hgraph-labels").on("change", update_labels);

            function update_labels() {
                if (d3.select("#hgraph-labels").property("checked")) {
                    d3.selectAll(".node-label").attr("visibility", "visible");

                } else {
                    d3.selectAll(".node-label").attr("visibility", "hidden");
                }
            }
        } catch (e) {
            console.log(e);
        }
    }
}