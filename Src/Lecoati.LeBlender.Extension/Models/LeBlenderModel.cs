using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Lecoati.LeBlender.Extension.Models
{
    [JsonObject]
    public class LeBlenderModel
    {
        [JsonProperty("global")]
        private IEnumerable<LeBlenderValue> Globals { get; set; }
        public LeBlenderValue Global { get { return Globals == null ? null : Globals.First(); } }

        [JsonProperty("value")]
        public IEnumerable<LeBlenderValue> Items { get; set; }
    }
}