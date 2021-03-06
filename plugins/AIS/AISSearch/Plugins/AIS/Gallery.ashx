<%@ WebHandler Language="C#" Class="ScreenSearch" %>

using System;
using System.Web;
using System.Data;
using System.Data.SqlClient;
using CommonWebUtil;
using System.Collections.Generic;
using System.Globalization;

public class ScreenSearch : JsonHandlerPublic {
    
    protected override object GetResult(HttpContext context)
    {
        int mmsi = int.Parse(context.Request["mmsi"]),
               imo = int.Parse(context.Request["imo"]);

        var result = new List<int>();
        using (var conn = new SqlConnection("Data Source=KOSMO-MSSQL2.kosmosnimki.ru;Failover Partner=KOSMO-MSSQL1.kosmosnimki.ru;Initial Catalog=Maps;User Id=Maps1410;Password=8ewREh4z"))
        {
            var com = conn.CreateCommand();

                com.CommandText = @"select id from AIS_Gallery where mmsi=@mmsi and imo=@imo order by id desc";
                var p = new SqlParameter("@mmsi", mmsi); com.Parameters.Add(p);
                    p = new SqlParameter("@imo", imo); com.Parameters.Add(p);
            conn.Open();
            var r = com.ExecuteReader();
            while (r.Read())
            {
                result.Add((int)r[0]);
            }
        }
        return result;
    }

}