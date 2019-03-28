/* 
    global $ 
    global fetch
    global d3
    global join
    global crossfilter
    global dc
*/

// USE CAPITIAL LETTERS TO REPRESENT CONSTANTS
const MONTHLY_RAINFALL_URL ='https://data.gov.sg/api/action/datastore_search?resource_id=778814b8-1b96-404b-9ac9-68d6c00e637b'
const MONTHLY_HUMIDITY = 'https://data.gov.sg/api/action/datastore_search?resource_id=585c24a5-76cd-4c48-9341-9223de5adc1d'
const MONTHLY_RAINY_DAYS = 'https://data.gov.sg/api/action/datastore_search?resource_id=8b94f596-91fd-4545-bf9e-7a426493b674'


function load()
{
   let data  = [];
   d3.queue().defer(d3.json, MONTHLY_RAINFALL_URL)
             .defer(d3.json, MONTHLY_HUMIDITY)
             .defer(d3.json, MONTHLY_RAINY_DAYS)
      .awaitAll(function(error, data){
  
         let monthly_rainfall = data[0].result.records;
         let monthly_humidity = data[1].result.records;
         let monthly_rain_days = data[2].result.records;
         console.log(monthly_rain_days);
         data = join(monthly_rainfall, monthly_humidity, 
                    'month', 'month', function(h, r){
                     
                        return {
                            month: r.month,
                            total_rainfall: r.total_rainfall,
                            humidity: h.rh_extremes_minimum
                        }
                    });
          data = join(monthly_rain_days, data, 'month', 'month',
                    function(d, r){
                        return {
                            month:d.month,
                            total_rainfall: d.total_rainfall,
                            humidity: d.humidity,
                            rainy_days: r.no_of_rainy_days
                        }
                    })
          console.log(data[0]);
          draw(data);
      })
}

function draw(data)
{
    let ndx = crossfilter(data);
    let rainfall_dim = ndx.dimension(function(d){
       return d.month.split('-')[0]; 
    });
    let rainfall_filter = rainfall_dim.group().reduceSum(dc.pluck('total_rainfall'));
    
     dc.barChart('#rainfall-chart')
            .width(600)
            .height(300)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(rainfall_dim)
            .group(rainfall_filter)
            .transitionDuration(500)
            .x(d3.scale.ordinal())
            .xUnits(dc.units.ordinal)
            .xAxisLabel("Year")
            .yAxis().ticks(4);
                       
    let humidity_dim = ndx.dimension(function(d){
      return d.month.split('-')[0]; 
    });

    let humidity_filter = humidity_dim.group().reduce(function(p, v){
        p.total += parseFloat(v.humidity);
        p.count += 1;
        p.average = p.total / p.count;
        return p;
    }, function(p,v){
     
        p.count -= 1;
        if (p.count == 0) {
            p.average = 0;
        } else {
               p.total -= v.total;
            p.average = p.total / p.count;
        }
        return p;
     
    }, function init(){
        return {
            total:0,
            count:0,
            average:0
        }
    });

    
    
     dc.barChart('#humidity-chart')
            .width(600)
            .height(300)
            .margins({ top: 10, right: 50, bottom: 30, left: 50 })
            .dimension(humidity_dim)
            .group(humidity_filter)
            .valueAccessor(function (d) {
                return d.value.average;
            })
            .transitionDuration(500)
            .x(d3.scale.ordinal())
            .xUnits(dc.units.ordinal)
            .xAxisLabel("Year")
            .yAxis().ticks(4);
    
    
    let day_dimension = ndx.dimension(function(d){
        if (d.rainy_days > 21) {
            return '21+';
        } else if (d.rainy_days >= 15) {
            return '15-20'
        } else if (d.rainy_days >= 10) {
            return '10-14'
        } 
        else if (d.rainy_days >= 5) {
            return '5 to 9'
        }
        else {
            return '0 to 4'
        }
    })
    
    let day_filter = day_dimension.group()
                        
    
     dc.pieChart('#pie-chart')
            .height(330)
            .radius(90)
            .transitionDuration(1500)
            .dimension(day_dimension)
            .group(day_filter);
            
        
    
    dc.renderAll();
    
    
}

$(function(){
    $('#load').click(function(){
        load();
    })
});