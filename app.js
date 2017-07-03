let _ = require('lodash')
let fs = require('fs')
let cells = require('./cellular')

let statue_head = [537, 538, 569, 570, 601, 602]

var cellList = cells()

var height = 100,
    width = 100,
    orientation = "orthogonal",
    renderorder = "right-down",
    tileheight = 32,
    tilewidth = 32,
    version = 1,
    map

// returns the index from a one-dimentional array (layer.data) given a 2D coordinate
function getIndexFromCoords(x, y) {
    //subtract 1 from x and y for zero-based arrays
    var index = (x - 1) + ((y - 1) * map.width)

    return index
}

//spacing: how often a tileset should be placed. Should be larger than the columns (20 for tree)
//offset: an amount to make it look like its more random
//rate: the occurence rate
function placeRandom(tileName, spacing, offset, rate, layer) {
    for (var k = 1; k < width; k += spacing) {
        for (var m = 0; m < height; m += spacing) {
            var rand = _.random(100)
            if (rand < rate) {
                var placeX = k + _.random(1, offset)
                var placeY = m + _.random(1, offset)
                placeTiles(tileName, placeX, placeY, layer)
            }
        }
    }
}

// the stacking order for various tilesets
let stacking = {
    "tree": [
        { "name": "Foreground", "range": _.range(73, 122) },
        { "name": "Middleground", "range": _.range(122, 137) },
        { "name": "Blocked", "range": [124, 125] }
    ]
}

//
function placeTilesFromAtlas(tiles, x, y, tileList, columns, layer, blocked) {
    var tileset = _.find(map.tilesets, ['name', tiles])
    var startTile = getIndexFromCoords(x, y)
    var i, j
    var tileList = tileList
    var firstTile = _.head(tileList)
    var lastTile = _.last(tileList)
    var columns = columns
    var chunkList = _.chunk(tileList, columns)
    var mapLayer = _.find(map.layers, ['name', layer]) || {}
    var blockedLayer = _.find(map.layers, ['name', "Blocked"])

    _.forEach(chunkList, function(row) {
        for (i = 0; i < columns; i++) {
            let newY = y + _.indexOf(chunkList, row)
            let newX = x + i
            let index = getIndexFromCoords(newX, newY)
            var currentTile = row[i]

            mapLayer.data[index] = currentTile

            if (blocked) {
                blockedLayer.data[index] = 137
            }
        }
    })
}

// returns an array of tile indexes for a specified area
// start is top left of area
function getAreaContents(startX, startY, rows, columns, layer) {
    var tileList = []
    var i, j, newX, newY, coordinate, contents
    var mapLayer = _.find(map.layers, ['name', layer])

    for (i = 0; i < columns; i++) {
        for (j = 0; j < rows; j++) {
            newX = startX + i
            newY = startY + j
            coordinate = getIndexFromCoords(newX, newY)
            contents = mapLayer.data[coordinate]
            tileList.push(contents)
        }
    }

    return tileList
}

function isTree(x, y) {
    var tree = false
    var fore = _.find(map.layers, ['name', "Foreground"])
    var mid = _.find(map.layers, ['name', "Middleground"])
    var foreList = getAreaContents(x, y, 8, 8, "Foreground")
    var midList = getAreaContents(x, y, 8, 8, "Middleground")
    var treeMidList = _.find(stacking.tree, ['name', 'Middleground'])
    var treeForeList = _.find(stacking.tree, ['name', "Foreground"])

    var foreIntersect = _.intersection(foreList, treeForeList.range)
    var midIntersect = _.intersection(midList, treeMidList.range)

    //console.log(foreIntersect, midIntersect)

    if (foreIntersect.length > 0 || midIntersect.length > 0) {
        tree = true
    }

    return tree
}


//place a tileset on a particular layer at a particular tilemap x, y coordinate
//layer arg is optional. Leave blank if there is a stacking order specified in the stack object
function placeTiles(tiles, x, y, layer) {
    var tileset = _.find(map.tilesets, ['name', tiles])
    var startTile = getIndexFromCoords(x, y)
    var i, j
    var firstTile = tileset.firstgid
    var lastTile = firstTile + tileset.tilecount - 1
    var columns = tileset.columns
    var tileList = _.range(firstTile, lastTile + 1)
    var chunkList = _.chunk(tileList, columns) // break the tile range into chunks (rows)
    var mapLayer = _.find(map.layers, ['name', layer]) || {}
    var stack = stacking[tiles]

    // loops through each row and column, looking up map index values and replacing with tileset values
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

// walking through every tile on map, replacing an original with a replacement at a random rate
function walkAndReplace(original, replacement, rate, layer, blocked) {
    let mapLayer = _.find(map.layers, ['name', layer])
    let blockedLayer = _.find(map.layers, ['name', "Blocked"])
    for (var p = 0; p < width * height; p++) {

        if (mapLayer.data[p] === original) {
            let rand = _.random(100)
            if (rand < rate) {
                mapLayer.data[p] = replacement

                if (blocked) {
                    blockedLayer.data[p] = 137
                }
            }
        }
    }
}

function makeLayer(layerName) {
    var layer = {},
        i

    layer.name = layerName
    layer.data = []
    layer.height = height
    layer.width = width
    layer.opacity = 1
    layer.type = "tilelayer"
    layer.visible = true
    layer.x = 0
    layer.y = 0

    // use the returned cellList to populate the Background layer
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
        },
        {
            "columns": 32,
            "firstgid": 138,
            "image": "terrain_atlas.png",
            "imageheight": 1024,
            "imagewidth": 1024,
            "margin": 0,
            "name": "terrain_atlas",
            "properties": {},
            "spacing": 0,
            "tilecount": 1024,
            "tileheight": 32,
            "tilewidth": 32
        }
    ],
    "version": version
}

function placeTrees(total) {
    var randX, randY, treeExists
    for (var z = 0; z < total; z++) {
        // keep this in bounds or the map will error. 8 tile margin
        randX = _.random(8, 92)
        randY = _.random(8, 92)
        treeExists = isTree(randX, randY)

        if (treeExists === false) {
            console.log(z)
            placeTiles("tree", randX, randY)
        }
    }
}

/*function fixMap() {
    var mid = _.find(map.layers, ['name', "Middleground"])
    var fore = _.find(map.layers, ['name', "Foreground"])
    var block = _.find(map.layers, ['name', "Blocked"])

    for (var i = 0; i < mid.data.length; i++) {
        if (mid.data[i] == null) {
            mid.data[i] = 0
            console.log("changing mid")
        }
    }

    for (var j = 0; j < fore.data.length; j++) {
        if (fore.data[j] == null) {
            fore.data[j] = 0
            console.log("changing fore")

        }
    }

    for (var k = 0; k < block.data.length; k++) {
        if (block.data[k] == null) {
            block.data[k] = 0
            console.log("changing block")

        }
    }

    console.log(mid.data.length, fore.data.length, block.data.length)
}*/


//placeRandom("tree", 20, 8, 79)
placeTrees(20)
walkAndReplace(938, 939, 25, "Background", false)
walkAndReplace(0, 1043, 1, "Middleground", false)
walkAndReplace(0, 935, 1, "Middleground", true)

//placeTilesFromAtlas('terrain_atlas', 16, 15, statue_head, 2, "Middleground", true)

//placeTiles("tree", 1, 1)

console.log(isTree(5, 8))


fs.writeFile('generated-map.json', JSON.stringify(map, null, 4), function(err) {
    if (err) return console.log(err)
    console.log('map has been generated')
})