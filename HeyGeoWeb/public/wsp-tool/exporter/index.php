<!DOCTYPE html>
<!--[if lt IE 7 ]> <html class="ie6"> <![endif]-->
<!--[if IE 7 ]>    <html class="ie7"> <![endif]-->
<!--[if IE 8 ]>    <html class="ie8"> <![endif]-->
<!--[if IE 9 ]>    <html class="ie9"> <![endif]-->
<!--
http://truyenthong.edu.vn/wsp
-->
<!--[if (gt IE 9)|!(IE)]><!--> 
<html class=""> <!--<![endif]-->
<head>
  <meta charset="UTF-8">
  <title>Chuyển file Sketchpad (GSP) thành Web Sketchpad</title>

    <script charset="utf-8" type="text/javascript" src="./js/jquery-2.1.0.js"></script>
    <script charset="utf-8" type="text/javascript" src="./js/wsp.js"></script>
    <script charset="utf-8" type="text/javascript" src="./js/wsp-runner.js"></script>
  <link rel="stylesheet" type="text/css" href="./css/custom.css">

  <link rel="stylesheet" type="text/css" href="css/exporter.css">
  <script type="text/javascript" src="./js/exporter/Export.js"></script>
  <script type="text/javascript" src="./js/exporter/SketchViewer.js"></script>
  <script type="text/javascript" src="./js/exporter/SketchContainer.js"></script>
  <script type="text/javascript" src="./js/exporter/InfoViewer.js"></script>
  <script type="text/javascript" src="./js/exporter/WSPTest.js"></script>
  <script type="text/javascript" src="./js/exporter/Server.js"></script>
  <script type="text/javascript" src="./js/exporter/DragDrop.js"></script>
  <script type="text/javascript" src="./js/exporter/Logger.js"></script>
  <script type="text/javascript" src="./js/browserdetect.js"></script>
  <script type="text/javascript" src="./js/exporter/main.js"></script>

  <script id="sketch-template" type="text/html-template"></script>
</head>

<body>
  <link rel="stylesheet" type="text/css" href="./bootstrap/css/bootstrap.min.css">
<link rel="stylesheet" type="text/css" href="./css/custom.css">
<script src="./bootstrap/js/bootstrap.min.js"></script>

<script src="./js/setenvironment.js"></script>

<nav class="navbar navbar-default" role="navigation">
  <div class="navbar-header">
    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#wsp-navbar-collapse-1">
      <span class="sr-only">Toggle navigation</span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
      <span class="icon-bar"></span>
    </button>
    <a class="navbar-brand home-link" href="./"><img src="./images/gsp_app.png"></a>
  </div>

  <div class="collapse navbar-collapse" id="wsp-navbar-collapse-1">
    <ul class="nav navbar-nav navbar-left">
      <li class="active"><a href="./exporter.php">Sketch Exporter</a></li>
<!--
      <li ><a href="./authoring.php">Authoring</a></li>
      <li ><a href="./current-functionalities.php">Release Notes</a></li>
      <li ><a href="./sample-web-sketches-gallery.php">Sample Gallery</a></li>
     </ul>
    <div class="betaenv-label">Beta Environment</div>
    <ul class="nav navbar-nav navbar-right">
      <li ><a href="./documentation/">Technical Documentation</a></li>
      <li ><a href="./releases.php">Downloads</a></li>
-->
      <li><a href="mailto:phucndm@gmail.com?Subject=Web Sketchpad Inquiry">Liên hệ với chúng tôi</a></li>
    </ul>
  </div>
</nav>
  <div id="wrapper">
    <ul id="tabs"></ul>
    <div id="sketch-viewer">
      <div id="collapseViews">
        <div id="testViewer"><header>Kết quả kiểm tra</header><pre class="report"></pre><div class="close-bar"></div></div>
        <div id="logViewer"><header>Gỡ rối</header><pre class="report"></pre><div class="close-bar"></div></div>
        <div id="jsonViewer"><header>JSON</header><pre class="report"></pre><div class="close-bar"></div></div>
        <div id="optionsViewer" class="hidden"><header>Các tùy chọn</header><pre class="report"></pre><div class="close-bar"></div></div>
      </div>
      <div id="divider">
        <img src="./images/vertical_lines.png">
      </div>
      <div id="sketchView">
        <div id="canvasMeasurements"></div>
        <div id="sketchControls">
          <button id="revertSketch" class="disabled">revert</button>
          <button id="clearTraces" class="disabled">clear traces</button>
        </div>
        <div id="sketchWrapper">
          <div id="sketchCanvas">
            <h4 class="subheader">Để chuyển mô hình GSP thành Web Sketchpad, </h4>
              <!--[if lt IE 10]><p class="browser-warning">The Exporter App does not support IE versions below IE10.  This is a separate requirement from the WSP library itself.</p><![endif]-->
            <h1 class="header" id="file-drag-prompt">kéo thả tệp GSP vào đây</h1>
            <div id="fileUploadButtonWrapper">
              <input type="file" id="fileUploadButton" class="clear" accept=".json, .js, .gsp">
              <button id="fileUploadVisibleButton">Chọn tệp</button>
            </div>
            <div class="sketch-area" id="pageOne"></div>
          </div>
        </div>
        <div id="exportMenuButton">
          <button type="button" class="btn btn-primary" data-toggle="modal" data-target=".options-modal">Chuyển</button>
        </div>
      </div>
    </div>
  </div>
  <!-- Modal -->
  <div class="modal fade options-modal" id="export-menu" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span> <span class="sr-only">Đóng</span></button>

          <h4 class="modal-title" id="myModalLabel">Export Document</h4>
        </div>

        <div class="modal-body">
          <form id="exportForm" method="post" action='exporter/export.php' name="exportForm">
            <input type="hidden" name="file-name"> <input type="hidden" name="sketch-doc"> <input type="hidden" name="export-minor"> <input type="hidden" name="postProcess">

            <table id="export-table">
              <tr class="export-major">
                <td><label><input type="radio" data-group="webpage-group" class="export-major" name="export-major" value="webpage" checked> Webpage</label></td>

                <td><label><input type="radio" data-group="json-group" class="export-major" name="export-major" value="json"> JSON</label></td>
              </tr>

              <tr class="export-minor">
                <td>
                  <div class="well">
                    <div class="webpage-group export-minor">
                      <label><input type="radio" data-group="webpage-group" class="export-minor-webpage" name="export-minor-webpage" value="standard" checked> Standard</label>
                    </div>

                    <div class="webpage-group export-minor">
                      <label><input type="radio" data-group="webpage-group" class="export-minor-webpage" name="export-minor-webpage" value="stripped"> No Branding</label>
                    </div>
                  </div>
                </td>

                <td>
                  <div class="well">
                    <div class="json-group export-minor">
                      <label><input type="radio" data-group="json-group" class="export-minor-json" name="export-minor-json" value="json" checked> JSON</label>
                    </div>

                    <div class="json-group export-minor">
                      <label><input type="radio" data-group="json-group" class="export-minor-json" name="export-minor-json" value="js"> Javascript</label>
                    </div>

                    <div>
                      <label id="varName">var:<input type="text" class="export-minor-json" name="varName">-json.js</label>
                    </div>
                  </div>
                </td>
              </tr>

              <tr class="setting">
                <td>
                  <div class="well">
                    <div class="setting">
                      <label><input type="radio" class="page" name="page" value="entire" checked> Entire Document</label>
                    </div>

                    <div class="setting">
                      <label><input type="radio" class="page" name="page" value="individual"> Individual Documents Per Page</label>
                    </div>

                    <div class="setting">
                      <label><input type="radio" class="page" name="page" value="current"> Current Page Only</label>
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td>Settings</td>
                <td>Widgets</td>
              </tr>

              <tr class="setting">
                <td>
                  <div class="well settings">
                    <div class="setting">
                      <label><input type="checkbox" class="disableScrolling" name="disableScrolling" value="true"> Disable Scrolling</label>
                    </div>

                    <div class="setting">
                      <label><input type="checkbox" class="nongeometric-not-selectable" name="nongeometric-not-selectable" value="true"> Non-Geometric Objects Unselectable</label>
                    </div>

                    <div class="setting">
                      <label><input type="checkbox" class="removeInaccessibleObjects" name="removeInaccessibleObjects" value="true"> Remove Inaccessible Objects</label>
                    </div>

                    <div class="setting">
                      <label class="includePageControls"><input type="checkbox" class="includePageControls" name="includePageControls" checked value="true"> Include Page Controls</label>
                    </div>

                    <div class="setting">
                      <label class="includeWspLogo"><input type="checkbox" class="includeWspLogo" name="includeWspLogo" value="false"> Include WSP Logo</label>
                    </div>

                    <div class="setting">
                      Util Menu: &nbsp; <label class="includeUtilDownload"><input type="checkbox" class="includeUtilDownload" name="includeUtilDownload" value="false"> Download</label> &nbsp; <label class="includeUtilUpload"><input type="checkbox" class="includeUtilUpload" name="includeUtilUpload" value="false"> Upload</label>
                    </div>
                  </div>
                </td>

                <td>
                  <div class="well widget">
                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="stylewidget" value="none">
                      </div><label class="widgetLabel">Style: <input type="checkbox" class="stylewidget" name="stylewidget" value="false"></label>
                    </div>

                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="tracewidget" value="none">
                      </div><label class="widgetLabel">Trace: <input type="checkbox" class="tracewidget" name="tracewidget" value="false"></label>
                    </div>

                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="labelwidget" value="none">
                      </div><label class="widgetLabel">Label: <input type="checkbox" class="labelwidget" name="labelwidget" value="false"></label>
                    </div>

                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="visibilitywidget" value="none">
                      </div><label class="widgetLabel">Visibility: <input type="checkbox" class="visibilitywidget" name="visibilitywidget" value="false"></label>
                    </div>

                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="deletewidget" value="none">
                      </div><label class="widgetLabel">Delete: <input type="checkbox" class="deletewidget" name="deletewidget" value="false"></label>
                    </div>

                    <div class="setting widget">
                      <div class="pagePrefDiv">
                        Pages:<input type="text" disabled class="pagePref" name="resetbutton" value="none">
                      </div><label class="widgetLabel">Reset Button: <input type="checkbox" class="resetbutton" name="resetbutton" value="false"></label>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </form>

          <div class="export-buttons">
            <button id="close-export" type="button" class="btn btn-default" data-dismiss="modal">Close</button> <button id="reset-export" type="reset" class="btn btn-default">Reset</button> <button id="submit-export" type="button" class="btn btn-default">Export</button>
          </div>
        </div>

        <!-- No content is defined for the modal footer.
        <div class="modal-footer"></div>
        -->
      </div>
    </div>
  </div>
  <div class="version">Release: 2020Q3, semantic Version: 4.8.0, Build Number: 1075, Build Stamp: a52eed0e7762/20210510180330</div>
</body>
</html>
