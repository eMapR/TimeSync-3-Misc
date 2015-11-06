

library(rjson)
library(lubridate)

csvFile="C:/Users/braatenj/Downloads/ee-chart.csv"
outjsonfile = "C:/git_repos/timesync/playground/allValues.json"


csv = read.csv(csvFile)
csv = csv[complete.cases(csv),]
colnames(csv)[1] = "Date"
Date = as.Date(csv[,1],"%m/%d/%y")
Year = format(Date, "%Y")
doy = yday(Date)

df = cbind(Date,Year,doy,csv[,2:ncol(csv)])

df$Date = as.character(df$Date)
df$Year = as.numeric(as.character(df$Year))
df$doy = as.numeric(as.character(df$doy))

for(i in 1:nrow(df)){
  object = toJSON(as.list(df[i,]))
  if(i == 1){
      allobjects = paste('{"PlotID": 1, "Values": [',object,sep="")
  } else if(i == nrow(df)){
    allobjects = paste(allobjects,",",object,"]}",sep="")
  } else {allobjects = paste(allobjects,",",object,sep="")}
}

write(allobjects,outjsonfile)


