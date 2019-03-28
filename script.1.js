/* 
    global $ 
    global fetch
    global d3
    global join
    global crossfilter
    global dc
*/

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
    let rainfall_dim = ndx.dimension(dc.pluck('month'));
    let rainfall_filter = rainfall_dim.group(function(month){
       return month.split('-')[0]; 
    })
    .reduceSum(dc.pluck('total_rainfall'));
    
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
                       
    let humidity_dim = ndx.dimension(dc.pluck('month'));
    // let humidity_filter = humidity_dim.group(dc.pluck('month'))
    //                         .reduceSum(dc.pluck('humidity'))
                            
    let humidity_filter = rainfall_dim.group(function(month){
      return month.split('-')[0]; 
    })    .reduce(function(p, v){
        p.total += parseFloat(v.humidity);
        p.count += 1;
        p.average = p.total / p.count;
        return p;
    }, function(p,v){
        p.total -= v.total;
        p.count -= 1;
        if (p.count == 0) {
            p.average = 0;
        } else {
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
    
    dc.renderAll();
    
    
}

$(function(){
    $('#load').click(function(){
        load();
    })
});