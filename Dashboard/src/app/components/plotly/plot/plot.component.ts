import { Component, OnInit , Input} from '@angular/core';

@Component({
  selector: 'app-plot',
  templateUrl: './plot.component.html',
  styleUrls: ['./plot.component.scss']
})
export class PlotComponent implements OnInit {
  @Input() data:any;
  @Input() xvalue:string;
  @Input() colorby:string;
  @Input() outcomes:any; 
  @Input() plottype:String ; // ["bar","hbar","tsline"]; 
  @Input() customdata:any;
  @Input() customconfig:any; 
  @Input() customlayout:any; 
  @Input() custommargins:any; 
  @Input() linewidth:number; 
  @Input() showlegend:boolean; 
  @Input() colorscheme=[];

  constructor() { }
  plotlayout: any;
  plotdata: any;
  mainconfig: any;
  plotlytype:string;  


  ngOnInit(): void {
    if (!this.linewidth){this.linewidth=5};
    if (!this.colorscheme){this.colorscheme=["#004c8c", "#0277bd", "#58a5f0", "#b71c1c", "#7f0000"];}
    this.make_plot();
  }

  ngOnChanges(changes: any) {
    this.make_plot();
  }


  make_plot(){
    this.mainconfig = {
      displayModeBar: false,
      scrollZoom: false,
      autosizable: true,
      locale: 'de',
      doubleClick: 'reset+autosize',
      showAxisDragHandles: false,
      showAxisRangeEntryBoxes: false,
      showTips: true,
      responsive: true      
    };
    if (this.plottype=="bar"){
    this.plotlytype="bar";
    this.plotlayout = {
      xaxis: { fixedrange: false, type: 'category', automargin: false },
      yaxis: { fixedrange: true, title: '', automargin: true ,rangemode: 'tozero'},
      autosize: false, padding: 0,
      legend: { x: 1,        xanchor: 'right',        y: .8    , bgcolor: 'ffffffa7'  },
      margin: { l: 0, r: 100, b: 100, t: 0 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent"
    };
    }

    if (this.plottype=="stackedbar"){
      this.plotlytype="bar";
      this.plotlayout = {
        barmode:"stack",
        xaxis: { fixedrange: false, type: 'category', automargin: false },
        yaxis: { fixedrange: true, title: '', automargin: true ,rangemode: 'tozero'},
        autosize: false, padding: 0,
        legend: { x: 1,        xanchor: 'right',        y: .8    , bgcolor: 'ffffffa7'  },
        margin: { l: 0, r: 100, b: 100, t: 0 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent"
      };
      }

    if (this.plottype=="tsline" || this.plottype=="lines" || this.plottype=="area" || this.plottype=="stackedarea"){
    this.plotlytype="lines";
    this.plotlayout = {
      xaxis: { fixedrange: false, automargin: false },
      yaxis: { fixedrange: true, title: '', automargin: true , rangemode: 'tozero'},
      autosize: false, padding: 0,
      legend: { x: 1,        xanchor: 'right',        y: .8    , bgcolor: 'ffffffa7'  },
      margin: { l: 0, r: 20, b: 20, t: 0 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent"
    };
  }

  if (this.plottype=="hbar"){
    this.plotlytype="hbar";
    this.plotlayout = {
      yaxis: { fixedrange: false, type: 'category', automargin: false ,rangemode: 'tozero'},
      xaxis: { fixedrange: true, title: '', automargin: true },
      autosize: false, padding: 0,
      legend: { x: 1,        xanchor: 'right',        y: .8   , bgcolor: 'ffffffa7'   },
      margin: { l: 200, r: 0, b: 20, t: 0 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent"
      
    };
  }
  if (this.custommargins){
    this.plotlayout['margin'] = this.custommargins;
  }
  if (this.showlegend){
    this.plotlayout['showlegend'] = true;
  }

  let plotdata = this.data;
  let outcomes = this.outcomes;
  if (this.colorby){
    outcomes = this.getuniqueValues(plotdata,this.colorby);
    plotdata = this.make_colorbyvalues();      
  }
  

  this.plotdata = this.make_plotdata(plotdata,this.xvalue,outcomes,this.plotlytype);
  }

  make_colorbyvalues(){
    let newdata = [];
    let inputdata = this.data;
    let thecolorvalues = this.getuniqueValues(inputdata,this.colorby).sort();   
    let thexvalues = this.getuniqueValues(inputdata,this.xvalue);   
    let theoutcome = this.outcomes[0];
    for (let xvalue of thexvalues){
      let topush = {};
      topush[this.xvalue]=xvalue;
      for (let tocolor of thecolorvalues){
        let datapoint = this.filterArray(this.filterArray(inputdata,this.colorby,tocolor),this.xvalue,xvalue)[0];
        if (datapoint){
          topush[tocolor]=datapoint[theoutcome];
        } 
      }
      newdata.push(topush);
    }
    return newdata;

  }

  

  make_trace(xdata= [] ,ydata = [],name:string,type=""){
    let trace = {
      x: xdata,
      y: ydata,
      name: name,
      type: type
    }
    if (this.plottype=="stackedarea"){
      trace['stackgroup']="one";
    }
    return trace;
  }

make_plotdata(source=[], xaxis="",ylist=[],type="bar",colors=this.colorscheme){
  let xdata = this.getValues(source,xaxis)
  let list = []
  let i = 0 
  for (let name in ylist) {
  
  let trace = this.make_trace(xdata ,this.getValues(source,ylist[i]),ylist[i],type=type);
   if (type=="hbar"){
    trace = this.make_trace(this.getValues(source,ylist[i]),xdata,ylist[i],type="bar")
    trace["orientation"]="h"    
   }
   if (type=="bar" || type=="bar" || type=="scatter" ){
    trace["marker"]= {
      color: colors[i]      
    }
    
   }
   if (type=="lines"  ){
    trace["line"]= {
      color: colors[i]     , 
      width: this.linewidth
    }
   }
   if (this.plottype=="area"  ){
     trace["fill"]="tozeroy";    
    }
   list.push(trace)
   i = i+1
  }   
  return list
}



getValues(array, key) {
   let values = [];
   for (let item of array){
     values.push(item[key]);
   }
   return values;
}

getuniqueValues(array, key) {
  let items = this.getValues(array, key);
  return [...new Set(items)];
}

filterArray(array,key,value){
  let i =0
  let result = []
  for (let item of array){
    if (item[key]==value){result.push(item)};
    i = i+1
  }
  return result
}




}
