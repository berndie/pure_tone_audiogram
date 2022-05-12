# Pure tone audiogram

A javascript library to create an interactive (pure-tone) audiogram response
recording  tool. With this, you can save the result of your audiogram 
electronically. In deployment, the only dependency is [d3.js](https://d3js.org/)
(version 3 is the only version that is supported).

[If you want to play with some examples, you can find them here](https://berndie.github.io/puretoneaudiogram.js/)

## How to use on your website

After running `npm install && npm run build`, you can find the files you will need to include for 
your website in the [dist](./dist) folder. If don't want to compile these files yourself,
no problem! [You can download the precompiled versions here](https://github.com/berndie/puretoneaudiogram.js/releases/tag/latest). We provide following possibilities:

* `audiogram.js`: The sourcecode, external import for `d3.js` necessary
* `audiogram.min.js`: The minimized sourcecode, external import for `d3.js` necessary 
* `audiogram_d3.min.js`: The minimized sourcecode combined with the `d3.js` sourcecode


* `audiogram.mjs`: The sourcecode, packaged as a [javascript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), external import for `d3.js` necessary
* `audiogram.min.mjs`: The sourcecode, packaged as a minimized [javascript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), external import for `d3.js` necessary
* `audiogram_d3.min.mjs`: The sourcecode, packaged as a minimized [javascript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules), packaged with `d3.js`

Concrete examples can be found in the `examples` folder.

### Step 1. Include the scripts on your website
```html

<script src="https://d3js.org/d3.v3.min.js"></script>
<script src="dist/audiogram.min.js"></script>

<!-- or -->

<script src="dist/audiogram_d3.min.js"></script>

<!-- or -->

<script src="https://d3js.org/d3.v3.min.js"></script>
<script type="module" src="dist/audiogram.min.mjs"></script>

<!-- or -->

<script type="module" src="dist/audiogram_d3.min.mjs"></script>

```


### Step 2. Instantiate the audiogram
```html
<div id="audiogram"></div>
<script>
    // Audiogram takes 2 arguments:
    //    an HTMLElement, which will serve as the parent for the audiogram 
    //    an options object, where you can override default options (see section below)
    let audiogram = new Audiogram(document.getElementById("audiogram"), {"ear":"left"});
</script>
```

You can change the `ear`, `conduction` and `masking` values dynamically (see
 [examples/single_example.html](examples/single_example.html)).

For more elaborate examples, have a look at the [examples](./examples) folder.

## Options

The `Audiogram` has a lot of options you can tune to your liking. Here, you can
find documentation of all options:

```javascript
let options = {
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
```


## Development 

You can install dependencies by running:
```
npm install
```
Testing, linting, building and cleaning is done with `npm run test`, `npm run lint`,
`npm run build` and `npm run clean` respectively. All scripts are written using `gulp`.
For linting [standardjs](https://standardjs.com/) is used, for testing [jest](https://jestjs.io/) is used. Tests can be found in [tests](tests).




