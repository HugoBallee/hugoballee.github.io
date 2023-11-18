// document.body.style.backgroundImage = "url('" + search.results[rnd]['url'] + "')";

function hndlr(response) {
    for (var i = 0; i < response.items.length; i++) {
        var item = response.items[i];
        // in production code, item.htmlTitle should have the HTML entities escaped.
        document.getElementById("demo").innerHTML += "<br>" + item.htmlTitle
    }
}

function generateCanvas() {
    var img = document.getElementById("inputPicture");
    var pixels = getPictureData(img);
    var definition = Math.max(Number(document.getElementById("definition").value), 1);
    var capDiameter = Math.max(Math.min(img.width, img.height), 1) / definition
    var nbColors = document.getElementById("nbColorsField").value;
    var maxIterations = document.getElementById("maxIterationsField").value;
    var backgroundColor = document.getElementById("colorField").value;
    backgroundColor = ColorFromHex(backgroundColor);
    var quincux = document.getElementById("quincux").checked;
    
    var prunedColors = pruneColors(pixels, nbColors, maxIterations);
    var draw = SVG('#svg_out')
    draw.size(img.width, img.height)
    background = draw.rect(img.width, img.height)
    background.fill(backgroundColor)
    var capsed = capsPicture(draw, prunedColors, capDiameter, backgroundColor, quincux);
    
    document.getElementById("demo").innerHTML = capsed.nbCaps + " caps";
}

function getPictureData(picture) {
    var canvas = document.createElement('canvas');
    canvas.width = picture.width;
    canvas.height = picture.height;

    canvas.getContext('2d').drawImage(picture, 0, 0, picture.width, picture.height);

    var pixels = [];
    for (var i = 0; i < picture.width; ++i) {
        pixels[i] = [];
        var pixelData = canvas.getContext('2d').getImageData(i, 0, 1, picture.height).data;
        for (var j = 0; j < picture.height; ++j)
            pixels[i][j] = new Color(pixelData[j*4], pixelData[j*4+1], pixelData[j*4+2]);
    }

    return pixels;
}

function pruneColors(colors, k, maxIterations) {
    var kMeansResult = kMeans(colors, k, maxIterations);
    return kMeanResultToColors(kMeansResult);
}

function kMeans(colors, k, maxIterations) {
    var means = [];
    var clusters = [];
    for (var i = 0; i < k; ++i)
        means.push(ColorRandom());

    for (var iteration = 0; iteration < maxIterations; ++iteration) {
        var numberPerClusters = [];
        var newMeans = [];
        for (i = 0; i < k; ++i) {
            numberPerClusters[i] = 0;
            newMeans[i] = new Color(0, 0, 0);
        }
        
        var meansString = "";
        for (var i = 0; i < means.length; ++i)
            meansString += means[i].toString() + " ";
        
        clusters = [];
        for (i = 0; i < colors.length; ++i) {
            clusters[i] = [];
            var closestId;
            for (var j = 0; j < colors[i].length; ++j) {
                closestId = getClosestId(colors[i][j], means);
                clusters[i][j] = closestId;
                numberPerClusters[closestId]++;
                newMeans[closestId] = newMeans[closestId].add(colors[i][j]);
            }
        }
        
        for (i = 0; i < k; ++i)
            means[i] = newMeans[i].divide(numberPerClusters[i]).floor();
    }
    
    for (i = 0; i < k; ++i)
        means[i] = means[i].floor();

    return { means: means, clusters: clusters };
}

function kMeanResultToColors(kMeanResults) {
    var colors = [];
    var clusters = kMeanResults.clusters;
    var means = kMeanResults.means;
    for (var i = 0; i < clusters.length; ++i) {
        colors[i] = [];
        for (var j = 0; j < clusters[i].length; ++j)
            colors[i][j] = means[clusters[i][j]];
    }
    return colors;
}

function capsPicture(draw, colors, capDiameter, backgroundColor, quincunx) {
    var oldWidth = colors.length;
    var oldHeight = colors[0].length;

    var newColors = [];

    var newWidth, newHeight, offsetX, offsetY, mainColor, center, point;
    var nbCaps = 0;
    var capRadius = capDiameter * 0.5;

    if (quincunx) {
        
    } else {
        newWidth = oldWidth - (oldWidth % capDiameter);
        newHeight = oldHeight - (oldHeight % capDiameter);
        nbCaps = Math.floor(oldWidth / capDiameter) * Math.floor(oldHeight / capDiameter);
    
        offsetX = Math.floor((oldWidth - newWidth) / 2);
        offsetY = Math.floor((oldHeight - newHeight) / 2);
        
        for (var i = 0; i < newWidth; ++i)
            newColors[i] = [];
        
        for (i = 0; i < newWidth; i = i + capDiameter) {
            for (var j = 0; j < newHeight; j = j + capDiameter) {
                mainColor = getMainColor(colors, i + offsetX, j + offsetY, capDiameter, capDiameter);
                center = new Vector2(i+capRadius, j+capRadius);
                circle = draw.circle(capDiameter)
                circle.move(i, j)
                circle.fill(mainColor)
                for (var m = 0; m < capDiameter; ++m) {
                    for (var n = 0; n < capDiameter; ++n) {
                        point = new Vector2(i+m, j+n);
                        if (point.isInCircle(center, capRadius))
                            newColors[i + m][j + n] = mainColor;
                        else
                            newColors[i + m][j + n] = backgroundColor;
                    }
                }
            }
        }
    }

    return { colors: newColors, nbCaps: nbCaps };
}

function getMainColor(colors, x, y, width, height) {
    var colorsIn = [];

    function indexColorIn(colorsIn, color) {
        for (var it = 0; it < colorsIn.length; ++it)
            if (color.equals(colorsIn[it].color))
                return it;
        return -1;
    }

    for (var o = x; o < x + width; ++o) {
        for (var p = y; p < y + height; ++p) {
            if (colorsIn.length > 0) {
                var indexColor = indexColorIn(colorsIn, colors[o][p]);
                if (indexColor >= 0)
                    colorsIn[indexColor].count++;
                else
                    colorsIn.push({ color: colors[o][p], count: 1 });
            } else
                colorsIn.push({ color: colors[o][p], count: 1 });
        }
    }

    var idMaxCount = 0;
    for (o = 1; o < colorsIn.length; ++o)
        if (colorsIn.count > colorsIn[idMaxCount].count)
            idMaxCount = o;

    return colorsIn[idMaxCount].color;
}

function setRenderCanvas(renderCanvasId, colors) {
    var width = colors.length;
    var height = colors[0].length;

    var c = document.getElementById(renderCanvasId);
    c.width = width;
    c.height = height;

    var ctx = c.getContext("2d");
    ctx.fillStyle = ColorRandom().toString();
    ctx.fillRect(0, 0, width, height);
    for (var i = 0; i < width; ++i) {
        for (var j = 0; j < height; ++j) {
            ctx.fillStyle = colors[i][j].toString();
            ctx.fillRect(i, j, 1, 1);
        }
    }
}

function getClosestId(color, colorClusters) {
    var minId = 0;
    var minSquareDist = ColorSquareDist(color, colorClusters[0]);
    var squareDist;
    for (var it = 1; it < colorClusters.length; ++it) {
        squareDist = ColorSquareDist(color, colorClusters[it]);
        if (squareDist < minSquareDist) {
            minSquareDist = squareDist;
            minId = it;
        }
    }
    return minId;
}

function Color(red, green, blue) {
    this.r = red;
    this.g = green;
    this.b = blue;
    
    this.equals = function(color) {
        if (this.r == color.r && this.g == color.g && this.b == color.b)
            return true;
        else
            return false;
    };
    
    this.add = function(color) {
        return new Color(
            this.r + color.r,
            this.g + color.g,
            this.b + color.b);
    };
    
    this.divide = function(f) {
        if (f <= 0) 
            return this;
        return new Color(this.r / f, this.g / f, this.b / f);
    };
    
    this.floor = function() {
        return new Color(
            Math.floor(this.r),
            Math.floor(this.g),
            Math.floor(this.b));
    };
    
    this.toString = function()  {
        return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
    };
}

function ColorSquareDist(colorA, colorB) {
    return (
        ((colorA.r - colorB.r) * (colorA.r - colorB.r)) +
        ((colorA.g - colorB.g) * (colorA.g - colorB.g)) +
        ((colorA.b - colorB.b) * (colorA.b - colorB.b))
        );
}

function ColorFromHex(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) 
        return new Color(
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16));
    else
        return new Color(255, 0, 255);
}

function ColorRandom() {
    var min = 0;
    var max = 255;
    return new Color(
        Math.floor((Math.random() * (max - min)) + min),
        Math.floor((Math.random() * (max - min)) + min),
        Math.floor((Math.random() * (max - min)) + min));
}

function Vector2(x, y) {
    this.x = x;
    this.y = y;
    
    this.squareDist = function(point) {
        return (this.x - point.x) * (this.x - point.x) + (this.y - point.y) * (this.y - point.y);
    };
    
    this.isInCircle = function(center, radius) {
        return this.squareDist(center) <= (radius*radius);
    };
}
