let _ = require('lodash')
let fs = require('fs')
let cells = require('./cellular')

var cellList = cells()

console.log(typeof(cellList))

var height = 100,
    width = 100,
    orientation = "orthogonal",
    renderorder = "right-down",
    tileheight = 32,
    tilewidth = 32,
    version = 1,
    map

function getIndexFromCoords(x, y) {
    //subtract 1 from x and y for zero-based arrays
    var index = (x - 1) + ((y - 1) * map.width)

    return index
}

let stacking = {
    "tree": [
        { "name": "Foreground", "range": _.range(73, 122) },
        { "name": "Middleground", "range": _.range(122, 137) },
        { "name": "Blocked", "range": [124, 125] }
    ]
}

//place a tileset on a particular layer at a particular tilemap x, y coordinate
//layer arg is optional. If left blank
function placeTiles(tiles, x, y, layer) {
    var tileset = _.find(map.tilesets, ['name', tiles])
    var startTile = getIndexFromCoords(x, y)
    var i, j
    var firstTile = tileset.firstgid
    var lastTile = firstTile + tileset.tilecount - 1
    var columns = tileset.columns
    var tileList = _.range(firstTile, lastTile + 1)
    var chunkList = _.chunk(tileList, columns) // break the tile range into chunks for ease of iterating
    var mapLayer = _.find(map.layers, ['name', layer]) || {}
    var stack = stacking[tiles]

    // loops through each row and column, looking up map index values and reaplacing with tileset values
    _.forEach(chunkList, function(row) {
        for (i = 0; i < columns; i++) {
            let newY = y + _.indexOf(chunkList, row)
            let newX = x + i
            let index = getIndexFromCoords(newX, newY)
            var currentTile = row[i]

            if (stack) {
                _.forEach(stack, function(_layer) {
                    if (_.includes(_layer.range, currentTile)) {
                        mapLayer = _.find(map.layers, ['name', _layer.name])
                        if (_layer.name === "Blocked") {
                            currentTile = 137
                            mapLayer.data[index] = currentTile
                        } else {
                            mapLayer.data[index] = currentTile
                        }
                    }
                })
            } else {
                mapLayer.data[index] = currentTile
            }
        }
    })
}

function makeLayer(layerName) {
    var layer = {},
        i,
        origin = 666

    layer.name = layerName
    layer.data = []
    layer.height = height
    layer.width = width
    layer.opacity = 1
    layer.type = "tilelayer"
    layer.visible = true
    layer.x = 0
    layer.y = 0

    if (layerName === "Background") {
        for (i = 0; i < 10000; i++) {
            layer.data.push(cellList[i])
        }
    } else {
        for (i = 0; i < 10000; i++) {
            layer.data.push(0)
        }
    }

    return layer
}

map = {
    "height": height,
    "width": width,
    "layers": [makeLayer("Background"), makeLayer("Middleground"), makeLayer("Foreground"), makeLayer("Blocked")],
    "nextobjectid": 1,
    "orientation": orientation,
    "properties": {},
    "renderorder": renderorder,
    "tileheight": tileheight,
    "tilewidth": tilewidth,
    "tilesets": [{
            "columns": 12,
            "firstgid": 1,
            "image": "grass-tiles.png",
            "imageheight": 192,
            "imagewidth": 384,
            "margin": 0,
            "name": "grass-tiles",
            "properties": {},
            "spacing": 0,
            "tilecount": 72,
            "tileheight": 32,
            "tilewidth": 32
        },
        {
            "columns": 8,
            "firstgid": 73,
            "image": "tree.png",
            "imageheight": 256,
            "imagewidth": 256,
            "margin": 0,
            "name": "tree",
            "properties": {},
            "spacing": 0,
            "tilecount": 64,
            "tileheight": 32,
            "tilewidth": 32
        },
        {
            "columns": 1,
            "firstgid": 137,
            "image": "blocked.png",
            "imageheight": 32,
            "imagewidth": 32,
            "margin": 0,
            "name": "blocked",
            "properties": {},
            "spacing": 0,
            "tilecount": 1,
            "tileheight": 32,
            "tilewidth": 32
        }
    ],
    "version": version
}

for (var k = 1; k < 20; k++) {
    var coolX = _.random(1, 100)
    var coolY = _.random(1, 100)
        //placeTiles("tree", coolX, coolY)
}
placeTiles("tree", 50, 50)

fs.writeFile('generated-map.json', JSON.stringify(map, null, 4), function(err) {
    if (err) return console.log(err)
    console.log('map has been generated')
})