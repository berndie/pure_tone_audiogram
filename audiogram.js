/**
 * A tool to record a subject's response to a (pure-tone) audiogram.
 * @author Bernd Accou <bernd.accou@kuleuven.be>
 */
class Audiogram { // eslint-disable-line no-unused-vars
  /**
   * Create a new Audiogram representation.
   * @constructor
   * @param {HTMLElement} element - The parent element for this audiogram
   * @param {Object} options - All options for this audiogram. Look at
   *  Audiogram.defaultOptions to see all possible options.
   */
  constructor (element, options = {}) {
    this.element = element
    this.dataset = {}
    this.options = Audiogram.objectExtend(
      Audiogram.objectExtend({}, this.defaultOptions()), options)

    // Check if we need to require d3js (in nodejs for example)
    if (typeof require !== 'undefined') {
      this.d3 = require('d3')
    } else if (Object.prototype.hasOwnProperty.call(window, 'd3')) {
      this.d3 = window.d3
    } else {
      throw Error('Can\'t load d3.js, which is a requirement.')
    }

    // d3.js version check
    const d3Version = parseInt(this.d3.version.split('.')[0])
    if (d3Version > 3) {
      throw Error('To use Audiogram.js, you will need d3 version <= 3')
    }

    // Set the customSymbolTypes and create the main svg object
    this.customSymbolTypes = new Map(
      Object.entries(this.options.symbolMapping))
    this.svg = this.d3.select(element)
      .append('svg')
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)

    // Instantiate the audiogram
    this.clearDataset()
    this.constructAxes()
    this.addAxesLabels()
    this.addGridLines()
    this.enableCustomSymbols()
    this.reloadData()
    this.attachGeneralListeners()
  }

  /**
   * Default options for the Audiogram.
   * @returns {Object} - All default options
   * */
  defaultOptions () {
    const that = this
    return {
      // Currently active ear. Can be any string, but `symbols`,
      // `lineConnection` and `colors` should be overridden if using a string
      // other than `"left"` or `"right"`
      ear: 'right',
      // The current conduction type. Typically `"bone"` or `"air"`, but can be
      // any string if `symbols` and `lineConnection` are overridden
      conduction: 'air',
      // If the current stimulus is masked.
      masking: false,
      // Strings to denote if masking is present or not. Must be an array of 2
      // values, the first corresponding if masking is applied, the second
      // one corresponding if no masking is applied. When overriding this,
      // it would be necessary to override `symbols` and `lineConnection` as well.
      maskingTypes: ['mask', 'nomask'],
      // The height of the audiogram (in pixels)
      height: 500,
      // The width of the audiogram (in pixels). By default an appropriate value
      // is calculated based on the size/padding of the parent element
      width: Math.round(
        this.element.offsetWidth -
        parseFloat(Audiogram.getCssValue(this.element, 'padding-left')) -
        parseFloat(Audiogram.getCssValue(this.element, 'padding-right'))
      ),
      // Margins for the audiogram (in pixels)
      margin: { top: 60, right: 50, bottom: 20, left: 50 },
      // The ticks to use for the x-axis. This will be displayed on top of the
      // audiogram and normally correspond to the frequencies.
      xTicks: [0, 125, 250, 500, 1000, 2000, 4000, 8000],
      // If you want to be able to select points in between your xTicks, you
      // can use this modifier to select in how many parts the space between
      // the xTicks should be divided. For example: specifying xTicksModifier
      // as 2, will give you one extra point between each xTick.
      xTicksModifier: 2,
      // The real domain for the x-axis. Because `xTicks` is often not linear
      // but exponential, the `xDomain` will be internally used to layout the
      // axis with a linear distance between them.
      xDomain: [0, 1000],
      // The domain for the y-axis.
      yDomain: [-20, 120],
      // The label for the x-axis.
      xLabel: 'Frequency (Hz)',
      // The label for the y-axis
      yLabel: 'Hearing level in dB',
      // The unit for the x-axis
      xUnit: 'Hz',
      // The unit for the y-axis
      yUnit: 'dB',
      // The resolution for datapoints on the y-axis in the `yDomain`.
      // When indicating a new point, the point will snap to the closest gridpoint.
      yStep: 5,
      // The distance between the gridlines on the y-axis
      yGridStep: 10,
      // The width of the 0 point/axis line
      yGridZeroWidth: '3px',
      // The (x and y) offset of the information label when
      // hovering one of the datapoints.
      // The actual message will be created by `hoverSymbolText`
      hoverLabelOffset: { x: -30, y: -15 },
      // Color codings for the different ears.
      // The symbols for the datapoints and lines between datapoints will use this value.
      colors: { left: 'blue', right: 'red' },
      // The size of the symbols denoting each datapoint (in pixels).
      symbolSize: 256,
      // The symbols to use for each datapoint.
      // The keys of this object must correspond to each possible combination
      // of `ear`, `combination` and `masking`, formatted as
      // `$(ear)_$(conduction)_$(maskingType)`
      symbols: {
        left_air_nomask: 'x',
        right_air_nomask: 'circle',
        left_bone_nomask: '<',
        right_bone_nomask: '>',
        left_air_mask: 'square',
        right_air_mask: 'triangle',
        left_bone_mask: '[',
        right_bone_mask: ']'
      },
      // CSS attributes of the lines connect datapoints.
      // The keys of this object must correspond to each possible combination
      // of `ear`, `combination` and `masking`, formatted as
      // `$(ear)_$(conduction)_$(maskingType)`. These lines will only be drawn
      // between datapoints of the same 'combination'.
      lineConnection: {
        left_air_nomask: { 'stroke-width': 2 },
        right_air_nomask: { 'stroke-width': 2 },
        left_bone_nomask: { 'stroke-dasharray': ('1, 1') },
        right_bone_nomask: { 'stroke-dasharray': ('1, 1') },
        left_air_mask: { 'stroke-dasharray': ('4, 4') },
        right_air_mask: { 'stroke-dasharray': ('4, 4') },
        left_bone_mask: { 'stroke-dasharray': ('12, 12') },
        right_bone_mask: { 'stroke-dasharray': ('12, 12') }

      },
      // Stroke width for the symbols used to mark datapoints
      strokeWidth: 4,
      // Multiplies for the stroke width of the symbols used to mark datapoints
      strokeWidthHoverMultiplier: 2,
      // When the user wants to remove a datapoint at a certain frequency/sound level,
      // `removeAllPoints` is used to determine whether only points using the current
      // configuration of `ear`, `conduction` and `masking` (`false`) or
      // whether all points at that location should be removed (`true`)
      removeAllPoints: true,
      // Callback which will be called everytime data is changed. This
      // callback will take 2 arguments:
      // The first argument is the Audiogram object. The second argument is
      // the current dataset (see `Audiogram.getDataset` for more info.
      onDataChange: function (obj, dataset) {},
      // The listener which should be used when hovering over a datapoint symbol
      mouseOverListener: this.mouseOverListener(),
      // The listener which should be used when stopping to hover over a datapoint symbol
      mouseOutListener: this.mouseOutListener(),
      // The general listeners to use with the `Audiogram`/d3.js figure.
      // This is a object with as key the event name, and as value the function/listener
      generalListeners: {
        click: function () {
          that.clickHandler(this, function (point) {
            that.addPoint(point)
          })
        },
        contextmenu: function () {
          that.clickHandler(this, function (point) {
            that.removePoint(point)
          })
        }
      },
      // A function that creates the text when hovering the symbol of a datapoint
      hoverSymbolText: that.defaultHoverSymbolText,
      // Mapping between the symbols defined in `symbols` and a function which
      // creates a d3.js/svg path
      symbolMapping: {
        x: function (size) {
          size = Math.sqrt(size)
          return 'M' + (-size / 2) + ',' + (-size / 2) +
            'l' + size + ',' + size +
            'm0,' + -(size) +
            'l' + (-size) + ',' + size
        },
        '<': function (size) {
          size = Math.sqrt(size)
          return 'M' + (-size / 2) + ',' + 0 +
            'l' + size + ',' + (-size / 2) +
            'l' + (-size) + ',' + size / 2 +
            'l' + size + ',' + size / 2
        },
        '>': function (size) {
          size = Math.sqrt(size)
          return 'M' + (size / 2) + ',' + 0 +
            'l' + -size + ',' + (-size / 2) +
            'l' + (size) + ',' + size / 2 +
            'l' + -size + ',' + size / 2
        },
        triangle: function (size) {
          size = Math.sqrt(size)
          const midline = Math.sqrt(size ** 2 - (size / 2) ** 2)
          return 'M' + (-size / 2) + ',' + (midline / 2) +
            'l' + (size) + ',' + 0 +
            'l' + (-size / 2) + ',' + -midline +
            'l' + (-size / 2) + ',' + (midline) +
            'l' + (size) + ',' + 0
        },
        ']': function (size) {
          size = Math.sqrt(size)
          return 'M' + 0 + ',' + size / 2 +
            'l' + (size / 2) + ',' + 0 +
            'l' + 0 + ',' + (-size) +
            'l' + (-size / 2) + ',' + 0
        },
        '[': function (size) {
          size = Math.sqrt(size)
          return 'M' + 0 + ',' + size / 2 +
            'l' + (-size / 2) + ',' + 0 +
            'l' + 0 + ',' + (-size) +
            'l' + (size / 2) + ',' + 0
        }

      },
      // Precision to be used when comparing floats
      floatPrecision: 0.001
    }
  }

  /**
   * Extend an object with an other object,
   * i.e. copy all attributes from obj2 to obj1.
   * @param obj1 {Object} - Object to extend
   * @param obj2 {Object} - Object to extend obj1 with
   * @returns {Object} - obj1 extended with obj2
   */
  static objectExtend (obj1, obj2) {
    const keys = Object.keys(obj2)
    for (let i = 0; i < keys.length; i += 1) {
      const val = obj2[keys[i]]
      if (Array.isArray(val)) {
        obj1[keys[i]] = val
      } else {
        // If it is not one of the types listed below
        // recursively call this function
        obj1[keys[i]] = [
          'string',
          'number',
          'array',
          'boolean',
          'function'].indexOf(typeof val) === -1
          ? Audiogram.objectExtend(obj1[keys[i]] || {}, val)
          : val
      }
    }
    return obj1
  }

  /**
   * Get the css value for a certain key for a certain element,
   * Similar to jQuery's .css() method
   * @param element {HTMLElement} - Element for the CSS
   * @param cssKey {string} - Textual representation of the css key you want to read
   * @returns {string} - Value for the requested CSS key for the requested element
   */
  static getCssValue (element, cssKey) {
    return window.getComputedStyle(element, null).getPropertyValue(cssKey)
  }

  /**
   * Clear the current dataset.
   */
  clearDataset () {
    // Clear the entire dataset
    this.dataset = {}
    this.reloadData()
  }

  /**
   * Construct axes for the audiogram.
   */
  constructAxes () {
    const options = this.options

    this.xScale = this.d3.scale.linear()
      .domain(options.xDomain)
      .range([options.margin.left, options.width - options.margin.right])

    this.yScale = this.d3.scale.linear()
      .domain(options.yDomain)
      .range([options.margin.top, options.height - options.margin.bottom])

    let i = -1
    const xTicks = options.xTicks
    this.xStep = (options.xDomain[1] - options.xDomain[0]) / xTicks.length
    this.xRange = this.d3.range(options.xDomain[0],
      options.xDomain[1] + this.xStep,
      this.xStep)
    this.xAxis = this.d3.svg.axis()
      .scale(this.xScale)
      .orient('top')
      .ticks(xTicks.length)
      .tickValues(this.xRange)
      .tickFormat(function (d) {
        i += 1
        return xTicks[i]
      })
    this.yAxis = this.d3.svg.axis().scale(this.yScale).orient('left')

    // Adds X-Axis as a 'g' element
    this.svg.append('g').attr({
      class: 'axis x-axis', // Give class so we can style it
      transform: 'translate(' + [0, options.margin.top] + ')'
    }).call(this.xAxis) // Call the xAxis function on the group

    // Adds Y-Axis as a 'g' element
    this.svg.append('g').attr({
      class: 'axis y-axis',
      transform: 'translate(' + [options.margin.left, 0] + ')'
    }).call(this.yAxis) // Call the yAxis function on the group
  }

  /**
   * Add labels to both axes
   */
  addAxesLabels () {
    this.svg.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', this.options.width / 2)
      .attr('y', 24)
      .text(this.options.xLabel)

    this.svg.append('text')
      .attr('transform', 'rotate(270)')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('x', -this.options.height / 2)
      .attr('dy', '1em')
      .attr('y', 0)
      .text(this.options.yLabel)
  }

  /**
   * Add grid lines
   */
  addGridLines () {
    const that = this

    const horizontalStepSize = (this.options.yDomain[1] -
      this.options.yDomain[0]) / this.options.yGridStep
    const zeroPoint = -this.options.yDomain[0] / this.options.yGridStep
    this.svg.selectAll('line.horizontalGrid')
      .data(this.yScale.ticks(horizontalStepSize))
      .enter()
      .append('line')
      .attr(
        {
          class: 'horizontalGrid',
          x1: that.options.margin.left,
          x2: that.options.width - that.options.margin.right,
          y1: function (d) {
            return that.yScale(d)
          },
          y2: function (d) {
            return that.yScale(d)
          },
          fill: 'none',
          // "shape-rendering" : "crispEdges",
          stroke: 'grey',
          'stroke-width': '1px'
        })

    if (Number.isInteger(zeroPoint) && zeroPoint >= 0) {
      this.element.getElementsByClassName(
        'horizontalGrid')[zeroPoint].setAttribute('stroke-width',
        this.options.yGridZeroWidth)
    }

    const dataRange = this.xRange
    dataRange.pop()
    this.svg.selectAll('line.verticalGrid')
      .data(dataRange)
      .enter()
      .append('line')
      .attr(
        {
          class: 'verticalGrid',
          y1: that.options.margin.top,
          y2: that.options.height,
          x1: function (d) {
            return that.xScale(d)
          },
          x2: function (d) {
            return that.xScale(d)
          },
          fill: 'none',
          // "shape-rendering" : "crispEdges",
          stroke: 'grey',
          'stroke-width': '1px'
        })
  }

  /**
   * A selector the select the correct dataset for the current options.
   * @returns {string} - Selector for the correct dataset
   */
  get datasetSelector () {
    return `${this.options.ear}_${this.options.conduction}_${this.options.masking
      ? this.options.maskingTypes[0]
      : this.options.maskingTypes[1]}`
  }

  /**
   * Reload the audiogram based on the data in the dataset
   */
  reloadData () {
    const that = this
    let cssClass
    let ear

    this.svg.selectAll('.symb').remove()
    this.loopOverDataset(this.dataset, function (subsetKey) {
      cssClass = '.symb .' + subsetKey
      ear = subsetKey.split('_')[0]
      that.svg.selectAll(cssClass)
        .data(that.dataset[subsetKey])
        .enter()
        .append('path')
        .attr('class', cssClass.replace('.', ''))
        .attr('transform', function (d, i) {
          return `translate(${that.xScale(d.x)}, ${that.yScale(d.y)})`
        })
        .attr('d', function (d) {
          return that.getSymbol(that.options.symbols[subsetKey],
            that.options.symbolSize)
        })
        .attr({
          'stroke-width': that.options.strokeWidth,
          stroke: that.options.colors[ear],
          fill: 'transparent'
        })
        // .attr(circleAttrs)  // Get attributes from circleAttrs var
        .on('mouseover', that.options.mouseOverListener)
        .on('mouseout', that.options.mouseOutListener)
    })
    this.connectPointsWithLine()
  }

  /**
   * Group points with the same X coordinate (frequency).
   * @param array {Array} - Array of points with at least an 'x' attribute.
   * @returns {Array} - Nested array of points grouped together by X coordinate
   */
  groupPointsForX (array) {
    const newAr = []
    let tempAr = []
    let i
    // Sort array in ascending x coordinate order
    const sortedArray = array.sort(function (e1, e2) {
      return e1.x - e2.x
    })
    // Create a temporary Array that we'll fill with groups of points
    // that have the same X coordinate (frequency).
    for (i = 0; i < sortedArray.length; i++) {
      tempAr.push(sortedArray[i])
      if (i >= sortedArray.length - 1) {
        newAr.push(tempAr)
      } else if (sortedArray[i].x !== sortedArray[i + 1].x) {
        newAr.push(tempAr)
        tempAr = []
      }
    }
    return newAr
  }

  /**
   * Connect points with a line.
   */
  connectPointsWithLine () {
    let groupedPoints
    let fromPoints
    let toPoints
    let ear

    // Remove old lines
    this.svg.selectAll('.audiogram-line').remove()

    for (const key in this.dataset) {
      if (Object.prototype.hasOwnProperty.call(this.dataset, key)) {
        groupedPoints = this.groupPointsForX(this.dataset[key])
        ear = key.split('_')[0]
        for (let i = 0; i < groupedPoints.length - 1; i++) {
          fromPoints = groupedPoints[i]
          toPoints = groupedPoints[i + 1]
          for (let fromPointIndex = 0; fromPointIndex <
          fromPoints.length; fromPointIndex++) {
            for (let toPointIndex = 0; toPointIndex <
            toPoints.length; toPointIndex++) {
              this.svg.append('line')
                .attr('class', 'audiogram-line')
                .style(
                  Audiogram.objectExtend({
                    stroke: this.options.colors[ear]
                  },
                  this.options.lineConnection[key])
                )
                .attr('x1', this.xScale(fromPoints[fromPointIndex].x))
                .attr('y1', this.yScale(fromPoints[fromPointIndex].y))
                .attr('x2', this.xScale(toPoints[toPointIndex].x))
                .attr('y2', this.yScale(toPoints[toPointIndex].y))
            }
          }
        }
      }
    }
  }

  /**
   * Calculate the position of a point on the audiogram.
   * @param coordinates {{x: number, y: number}} - Coordinates in pixels
   * @returns {{x: number, y: number}} - Coordinates according
   * to audiogram axes
   */
  calculatePosition (coordinates) {
    // Normally we go from data to pixels, but here we're doing pixels to data
    const newData = {
      x: Math.round(this.xScale.invert(coordinates[0])),
      y: Math.round(this.yScale.invert(coordinates[1]))
    }
    const xStep = this.options.xDomain[1] / (this.options.xTicks.length * this.options.xTicksModifier)
    const xGrid = this.createGrid(xStep, this.options.xDomain[1] - xStep * (this.options.xTicksModifier - 1))
    const yGrid = this.createGrid(this.options.yStep, this.options.yDomain[1], this.options.yDomain[0])

    // Snap to grid
    newData.x = this.snapToGrid(newData.x, xGrid)
    newData.y = this.snapToGrid(newData.y, yGrid)
    return newData
  }

  createGrid (step, stop, start = 0) {
    let currentValue = start
    const result = []
    while (currentValue < stop) {
      result.push(currentValue)
      currentValue += step
    }
    return result
  }

  /**
   * Default function to handle a click.
   * This will prevent the default interaction and pass the position to
   * the callback.
   * @param clickObj {Event} - Click event
   * @param callback {function({x: number, y:number})} - Optional callback to
   * handle the calculated position
   */
  clickHandler (clickObj, callback) {
    this.d3.event.preventDefault()
    const coords = this.d3.mouse(clickObj)
    const newData = this.calculatePosition(coords)
    callback(newData)
  }

  /**
   * Attach general listeners as defined in the (default)options.
   */
  attachGeneralListeners () {
    for (const eventName in this.options.generalListeners) {
      if (Object.prototype.hasOwnProperty.call(this.options.generalListeners,
        eventName)) {
        this.svg.on(eventName, this.options.generalListeners[eventName])
      }
    }
  }

  /**
   * Add a new point to the Audiogram.
   * @param newPoint {{x: number, y:number}} - Point location to add
   */
  addPoint (newPoint) {
    if (!Object.prototype.hasOwnProperty.call(this.dataset,
      this.datasetSelector)) {
      this.dataset[this.datasetSelector] = []
    }
    this.dataset[this.datasetSelector].push(newPoint) // Push data to our array
    // Remove stale hovertext
    this.removeTextForPoint(newPoint)

    const count = this.countDuplicates(newPoint)
    if (count > 1) {
      this.addTextForPoint(newPoint)
    }
    this.reloadData()
    this.options.onDataChange(this, this.getData())
  }

  /**
   * Remove a point from the Audiogram.
   * With "removeAllPoints" you can control whether points across different
   * conduction types/ears should be removed as well.
   * @param point {{x: number, y:number}} - Point location to remove
   */
  removePoint (point) {
    const that = this
    this.removeTextForPoint(point)
    // Remove it from the dataset, or it will magically reappear
    this.loopOverDataset(this.dataset, function (subsetKey, point2, index) {
      if (point.x === point2.x && point.y === point2.y) {
        if (that.options.removeAllPoints || subsetKey ===
          that.datasetSelector) {
          that.dataset[subsetKey].splice(index, 1)
          return index - 1
        } else {
          return index
        }
      }
    })
    this.reloadData()
    this.options.onDataChange(this, this.getData())
  }

  /**
   * Remove the hover text for a certain point.
   * @param point {{x:number, y:number}} - Point to remove the hover text for
   * @param keepPoint {boolean} - Whether the point will be removed
   */
  removeTextForPoint (point, keepPoint = false) {
    const count = this.countDuplicates(point)

    // '.' is not allowed in a d3 selector
    const xString = point.x.toString().replace('.', '_')
    const yString = point.y.toString().replace('.', '_')

    if (count <= 1) {
      // Use D3 to select element, change color back to normal
      this.d3.select('#t' + xString + '-' + yString + '-' + count).remove()
    } else {
      const total = keepPoint ? count - 1 : count
      for (let j = 0; j < total; j++) {
        this.d3.select('#t' + xString + '-' + yString + '-' + (j + 1)).remove()
      }
    }
  }

  /**
   * Add a hover text for a point
   * @param point {{x:number, y:number}} - Location of the point to add text for
   */
  addTextForPoint (point) {
    const that = this
    const count = this.countDuplicates(point)

    const xString = point.x.toString().replace('.', '_')
    const yString = point.y.toString().replace('.', '_')

    // Create an id for text so we can select it later for removing on mouseout
    const id = 't' + xString + '-' + yString + '-' + count

    if (!this.d3.select('#' + id)[0][0]) {
      // Specify where to put label of text
      this.svg.append('text').attr({
        id: id,
        x: function () {
          return that.xScale(point.x) + that.options.hoverLabelOffset.x
        },
        y: function () {
          return that.yScale(point.y) + that.options.hoverLabelOffset.y
        }
      }).text(function () {
        // Get the correct value in Hz (not coordinates)
        return that.options.hoverSymbolText(point, count)
      })
    }
  }

  /**
   * Text to display when hovering over a symbol
   * @param point {{x:number, y:number}} - Location of the symbol in axes coordinates
   * @param count {number} - Number of points with the same locations
   * @returns {string} - Text to display on hover
   */
  defaultHoverSymbolText (point, count) {
    // "this" means the options object in this context
    const xRelativeToXTicks = point.x * this.xTicks.length / this.xDomain[1]
    const remainder = xRelativeToXTicks % 1
    let x
    // If it is in between 2 xTicks, we will do an linear interpolation.
    if (remainder >= this.floatPrecision) {
      x = (this.xTicks[Math.ceil(xRelativeToXTicks)] - this.xTicks[Math.floor(xRelativeToXTicks)]) / 2 + this.xTicks[Math.floor(xRelativeToXTicks)]
    } else {
      x = this.xTicks[Math.round(xRelativeToXTicks)]
    }
    // Display a short float
    if (x % 1 > this.floatPrecision) {
      x = x.toFixed(1)
    }

    if (count === 1) {
      return `${x}${this.xUnit} at ${point.y}${this.yUnit}`
    } else {
      return `${x}${this.xUnit} at ${point.y}${this.yUnit} (${count} times)`
    }
  }

  /**
   * Create a handler for mouseover events on points of the Audiogram.
   * @returns {function} - Handler for mouseover events on points of the Audiogram
   */
  mouseOverListener () { // Add interactivity
    const that = this

    function mouseOverHandler (d, _) {
      // Use D3 to select element, change color and size
      that.d3.select(this).attr({
        // fill: "orange",
        'stroke-width': that.options.strokeWidth *
          that.options.strokeWidthHoverMultiplier
      })
      that.addTextForPoint(d)
    }

    return mouseOverHandler
  }

  /**
   * Create a handler for mouseout events on points of the Audiogram.
   * @returns {function} - Handler for mouseout events on points of the Audiogram
   */
  mouseOutListener () {
    const that = this

    function mouseOutHandler (point, i) {
      that.d3.select(this).attr({
        'stroke-width': that.options.strokeWidth
      })
      that.removeTextForPoint(point, true)
    }

    return mouseOutHandler
  }

  /**
   * Count all duplicates of a point.
   * @param point {{x:number, y:number}} - Location of the point
   * @returns {number} - The number of points at the location defined by point
   */
  countDuplicates (point) {
    let count = 0
    this.loopOverDataset(this.dataset, function (subsetKey, newPoint) {
      if (point.x === newPoint.x && point.y === newPoint.y) {
        count += 1
      }
    })
    return count
  }

  /**
   * Snap a value to a 1D grid.
   * @param value {number} - Value to snap to the grid
   * @param grid {Array} - The grid locations
   * @returns {number}
   */
  snapToGrid (value, grid) {
    let smallestDistance = Infinity
    let result = Infinity
    let distance
    for (let gridIndex = 0; gridIndex < grid.length; gridIndex++) {
      distance = Math.abs(grid[gridIndex] - value)
      if (smallestDistance > distance) {
        smallestDistance = distance
        result = grid[gridIndex]
      }
    }
    return result
  }

  /**
   * Enable the use of custom symbols for the audiogram.
   */
  enableCustomSymbols () {
    const that = this
    this.d3.svg.customSymbol = function () {
      let type
      let size = that.options.symbolSize

      function symbol (d, i) {
        return that.customSymbolTypes.get(type.call(this, d, i))(
          size.call(this, d, i))
      }

      symbol.type = function (_) {
        if (!arguments.length) return type
        type = that.d3.functor(_)
        return symbol
      }
      symbol.size = function (_) {
        if (!arguments.length) return size
        size = that.d3.functor(_)
        return symbol
      }
      return symbol
    }
  }

  /**
   * Get a symbol based on its type and size
   * @param type {string} - Symbol type
   * @param size {number} - Size of the symbol
   * @returns {d3.symbol} - td3.js symbol
   */
  getSymbol (type, size) {
    if (this.d3.svg.symbolTypes.indexOf(type) !== -1) {
      return this.d3.svg.symbol().type(type).size(size)()
    } else {
      return this.d3.svg.customSymbol().type(type).size(size)()
    }
  }

  /**
   * Loop over the dataset attribute
   * @param dataset {Object} - A mapping between types and arrays with points
   * @param callback {function} - Callback which accepts the current key of the dataset and the current element
   */
  loopOverDataset (dataset, callback) {
    let subset = ''

    function recursiveLoop (dataset, alreadyDefinedKey) {
      for (const subsetKey in dataset) {
        if (Object.prototype.hasOwnProperty.call(dataset, subsetKey)) {
          subset = dataset[subsetKey]
          if (Array.isArray(subset)) {
            let i = 0
            let temp
            if (typeof alreadyDefinedKey !== 'undefined') {
              alreadyDefinedKey = alreadyDefinedKey + '_' + subsetKey
            }
            while (i < subset.length) {
              temp = callback(subsetKey, subset[i], i, alreadyDefinedKey)
              if (typeof temp !== 'undefined') {
                i = temp
              }
              i++
            }
          } else {
            const newSubsetKey = typeof alreadyDefinedKey === 'undefined' ? subsetKey : alreadyDefinedKey + '_' + subsetKey
            recursiveLoop(dataset[subsetKey], newSubsetKey)
          }
        }
      }
    }

    recursiveLoop(dataset)
  }

  /**
   * Convert a dataset to a hierarchical format (ear > conduction > masking)
   * @param oldDataset {Object} - Dataset to convert
   * @param pointModifier {function} - Function to convert points to other values
   * @returns {Object} - New dataset with converted points
   */
  convertToHierarchicalDataset (oldDataset, pointModifier) {
    const newDataset = {}
    let convertedPoint
    let splitKeys
    let currentObject
    this.loopOverDataset(oldDataset, function (subsetKey, point) {
      convertedPoint = pointModifier(point)
      splitKeys = subsetKey.split('_')
      currentObject = newDataset
      for (let keyIndex = 0; keyIndex < splitKeys.length; keyIndex++) {
        if (keyIndex === splitKeys.length - 1 &&
          Object.prototype.hasOwnProperty.call(currentObject,
            splitKeys[keyIndex])) {
          currentObject[splitKeys[keyIndex]].push(convertedPoint)
        } else if (keyIndex === splitKeys.length - 1 &&
          !Object.prototype.hasOwnProperty.call(currentObject,
            splitKeys[keyIndex])) {
          currentObject[splitKeys[keyIndex]] = [convertedPoint]
        } else if (!Object.prototype.hasOwnProperty.call(currentObject,
          splitKeys[keyIndex])) {
          currentObject[splitKeys[keyIndex]] = {}
        }
        if (!Array.isArray(currentObject[splitKeys[keyIndex]])) {
          currentObject = currentObject[splitKeys[keyIndex]]
        }
      }
    })
    return newDataset
  }

  convertToFlatDataset (oldDataset, pointModifier) {
    const newDataset = {}
    let convertedPoint
    this.loopOverDataset(oldDataset, function (subsetKey, point, i, flatKey) {
      convertedPoint = pointModifier(point)
      if (!Object.prototype.hasOwnProperty.call(newDataset, flatKey)) {
        newDataset[flatKey] = []
      }
      newDataset[flatKey].push(convertedPoint)
    })
    return newDataset
  }

  fromCoordinatesToUnits (point) {
    const convertedPoint = {}
    const xRelativeToXTicks = point.x * this.options.xTicks.length / this.options.xDomain[1]
    const remainder = xRelativeToXTicks % 1
    let x
    // If it is in between 2 xTicks, we will do an linear interpolation.
    if (remainder >= this.options.floatPrecision) {
      x = (this.options.xTicks[Math.ceil(xRelativeToXTicks)] - this.options.xTicks[Math.floor(xRelativeToXTicks)]) / this.options.xTicksModifier + this.options.xTicks[Math.floor(xRelativeToXTicks)]
    } else {
      x = this.options.xTicks[Math.round(xRelativeToXTicks)]
    }
    convertedPoint[this.options.xUnit] = x
    convertedPoint[this.options.yUnit] = point.y
    return convertedPoint
  }

  /**
   * Get data for this audiogram.
   * @returns {Object} - Audiogram data, structured hierarchically by ear, conduction type and masking
   */
  getData (flat = false) {
    const that = this
    if (flat) {
      return this.convertToFlatDataset(this.dataset, function (point) { return that.fromCoordinatesToUnits(point) })
    } else {
      return this.convertToHierarchicalDataset(this.dataset, function (point) { return that.fromCoordinatesToUnits(point) })
    }
  }

  interpolateXTicks () {
    const interpolated = []
    for (let xTickIndex = 0; xTickIndex < this.options.xTicks.length - 1; xTickIndex++) {
      const diff = this.options.xTicks[xTickIndex + 1] - this.options.xTicks[xTickIndex]
      for (let modIndex = 0; modIndex < this.options.xTicksModifier; modIndex++) {
        interpolated.push(this.options.xTicks[xTickIndex] + (diff / this.options.xTicksModifier) * modIndex)
      }
    }
    interpolated.push(this.options.xTicks[this.options.xTicks.length - 1])
    return interpolated
  }

  /**
   * Set data for this audiogram.
   * @param newData {Object} - Audiogram data, structured hierarchically by ear, conduction type and masking
   */
  setData (newData) {
    const that = this
    const spacing = that.options.xDomain[1] / (that.options.xTicks.length * that.options.xTicksModifier)
    const interpolatedXticks = this.interpolateXTicks()
    let x
    this.dataset = this.convertToFlatDataset(newData, function (point) {
      x = that.snapToGrid(point[that.options.xUnit], interpolatedXticks)

      return {
        x: interpolatedXticks.indexOf(x) * spacing,
        y: point[that.options.yUnit]
      }
    })
    this.reloadData()
  }
}

// Can be used as script, or in nodejs as module
if (typeof module !== 'undefined') {
  module.exports = Audiogram
}
