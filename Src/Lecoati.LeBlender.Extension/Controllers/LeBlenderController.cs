using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Web;
using System.Web.Mvc;
using Umbraco.Web.Mvc;
using Lecoati.LeBlender.Extension;
using Lecoati.LeBlender.Extension.Models;
using Newtonsoft.Json;
using Umbraco.Web.Editors;
using Umbraco.Core.Logging;
using Umbraco.Web;

namespace Lecoati.LeBlender.Extension.Controllers
{
    public class LeBlenderController : SurfaceController
    {
        [ChildActionOnly]
        public ActionResult RenderEditor(string editorAlias, string frontView, LeBlenderModel model)
        {
            var CurrentContent = Helper.GetCurrentContent();
            var siteNode = CurrentContent.Site();
            var themeName = "";
            var viewsRoot = "/views/partials/grid/editors";
            if (siteNode.HasValue("themeName")) {
                themeName = siteNode.GetPropertyValue<string>("themeName");
                //Find the Active Theme, and check if there's a corresponding "Editor" file within the Theme Fodlers that we can use as the front end renderer instead of the generic one. 
                if (!string.IsNullOrEmpty(themeName))
                {
                    if (System.IO.File.Exists(String.Format("{0}/theme/{1}/views/partials/grid/editors/{2}.cshtml", Helper.RootPath(), themeName, Helper.FirstCharToUpper(editorAlias))))
                    {
                        viewsRoot = String.Format("/theme/{0}/views/partials/grid/editors", themeName);
                    }
                }
            }
            // Check if the frontView is a custom path
            if (string.IsNullOrEmpty(frontView))
            {
                frontView = String.Format("{0}/{1}.cshtml", viewsRoot,  Helper.FirstCharToUpper(editorAlias));
            }
            else if (frontView.IndexOf("/") < 0)
            {
                frontView = string.Format("{0}/{1}.cshtml", viewsRoot, frontView);
            }

            // Look for a custom controller
            var controllerType = Helper.GetLeBlenderController(editorAlias);
            if (controllerType != null)
            {

                try
                {
                    // Load a controller instance
                    var controllerInstance = (LeBlenderController)Activator.CreateInstance(controllerType);
                    controllerInstance.ControllerContext = this.ControllerContext;

                    // Take the view name as default method
                    var parts = frontView.Split(new char[] { '/', '\\' });
                    var method = parts.Last().Split('.').First();
                    var actionMethod = controllerType.GetMethod(method);

                    if (actionMethod == null)
                    {
                        method = "Index";
                        actionMethod = controllerType.GetMethod("Index");
                    }

                    if (actionMethod == null)
                        throw new Exception("No default method '" + method + "' was found");

                    // Set the specific model
                    var parameter = actionMethod.GetParameters().First();
                    var type = parameter.ParameterType.UnderlyingSystemType;
                    var typeInstance = (LeBlenderModel)Activator.CreateInstance(type);
                    typeInstance.Items = model.Items;

                    // Invoke the custom controller
                    var actionResult = (ViewResult)controllerType.GetMethod(method).Invoke(controllerInstance, new[] { typeInstance });

                    // Return the action result 
                    actionResult.ViewName = frontView;
                    return actionResult;
                }
                catch (Exception ex)
                {
                    LogHelper.Error<LeBlenderController>("Could not load LeBlender invoke the custom controller", ex);
                }

            }

            return PartialView(frontView, model);
            
        }
    }
}