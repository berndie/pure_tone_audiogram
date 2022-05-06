
const Audiogram = require("../src/audiogram.js")
beforeEach(function () {
    // Set up our document body
    document.body.innerHTML = '<div id="test"><div>'
  },
)
test('Audiogram.getData', function () {

    let a = new Audiogram(document.getElementById('test'), { 'ear': 'left' })
    a.dataset = {
      'left_air_nomask': [{ x: 1, y: 2 }],
      'left_bone_mask': [{ x: 200, y: 3 }, { x: 2, y: 2 }],
      'right_air_mask': [],
      'right_air_nomask': [{ x: -11, y: -2 }],
    }
    expect(a.getData()).toStrictEqual( {
        "left":  {
          "air":  {
            "nomask":  [
               {
                 "Hz": 62.5,
                 "dB": 2,
              },
            ],
          },
          "bone": {
            "mask": [
             {
               // closest x to 200
               "Hz": 187.5,
               "dB": 3,
             },
             {
               "Hz": 62.5,
               "dB": 2,
             },
           ],
          },
        },
        "right":  {
          "air":  {
           "nomask": [
             {
               // This is the lower bound for Hz.
               "Hz": 0,
               "dB": -2,
             },
           ],
          },
        },
      })



})

test("Audigram.setData", function(){
      let a = new Audiogram(document.getElementById('test'), { 'ear': 'left' })
      a.setData(
        {
        "left":  {
          "air":  {
            "nomask":  [
               {
                 "Hz": 0,
                 "dB": 2,
              },
            ],
          },
          "bone": {
            "mask": [
             {
               // closest x to 200
               "Hz": 250,
               "dB": 3,
             },
             {
               "Hz": 0,
               "dB": 2,
             },
           ],
          },
        },
        "right":  {
          "air":  {
           "nomask": [
             {
               // This is the lower bound for Hz.
               "Hz": 0,
               "dB": -2,
             },
           ],
          },
        },
      }
    )

    expect(a.dataset).toStrictEqual({
      'left_air_nomask': [{ x: 0, y: 2 }],
      'left_bone_mask': [ { x: 0, y: 2 }, { x: 250, y: 3 },],
      'right_air_nomask': [{ x: 0, y: -2 }],
    })
})

test("Audiogram.objectExtend", function(){
  let obj1 = {'a': {'b': 1, 'c':[1, 2, 3], 'd': {'e':'abc'}}, "e": true};
  let obj2 = {'a': {'b': [1], 'c':'test', 'd':{'f':'def'}, 'g':1}, 'e': false, 'h':1};
  let new_obj = Audiogram.objectExtend(obj1, obj2)
  expect(new_obj).toStrictEqual({"a": {"b": [1], "c": "test", "d": { "e": "abc", "f": "def"},"g": 1},"e": false,"h": 1})
})

