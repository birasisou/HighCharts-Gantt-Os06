beforeAll(function () {
  LoggerModule.setDebug("error");
});

describe("Modèle de données Oris", function () {
  // Dans notre modèle, si une valeur est manquante (ou pas parsable dans le type demandé), elle vaut null
  // 'null' est une valeur (absence de valeur) > 'typeof null == "object"'
  // 'undefined' est l'absence d'initialisation > 'typeof undefined == "undefined"'
  let NO_VALUE = null;

  describe("Initialisé sans valeur", function () {
    let data = new OrisData();

    it(data.asRaw() + ' asRaw', function () {
      expect(data.asRaw()).toEqual(undefined);
    });
    it(data.asRaw() + ' asBoolean', function () {
      expect(data.asBoolean()).toBeUndefined();
    });
    it(data.asRaw() + ' asDateObject', function () {
      expect(data.asDateObject()).toBeUndefined();
    });
    it(data.asRaw() + ' asNumber', function () {
      expect(data.asNumber()).toBeUndefined();
    });
    it(data.asRaw() + ' asRgb', function () {
      expect(data.asRgb()).toBeUndefined();
    });
    it(data.asRaw() + ' asTimestamp', function () {
      expect(data.asTimestamp()).toBeUndefined();
    });
  });

  describe('Initialisé avec Number (timestamp)', function () {
    // Valeurs à tester
    let values = [
      {
        raw: 0,
        expected: {
          raw: 0,
          boolean: false,
          date: new Date(0),
          number: 0,
          timestamp: new Date(0).getTime(),
          rgb: undefined
        }
      },
      {
        raw: 1,
        expected: {
          raw: 1,
          boolean: true,
          date: new Date(1),
          number: 1,
          timestamp: new Date(1).getTime(),
          rgb: undefined
        }
      },
      {
        raw: NaN,
        expected: {
          raw: NaN,
          boolean: undefined,
          date: new Date(NaN),
          number: undefined,
          timestamp: new Date(NaN).getTime(),
          rgb: undefined
        }
      },
      {
        raw: -10,
        expected: {
          raw: -10,
          boolean: undefined,
          date: new Date(-10),
          number: -10,
          timestamp: new Date(-10).getTime(),
          rgb: undefined
        }
      },
      {
        raw: -50.5,
        expected: {
          raw: -50.5,
          boolean: undefined,
          date: new Date(-50.5),
          number: -50.5,
          timestamp: new Date(-50.5).getTime(),
          rgb: undefined
        }
      },
      {
        raw: 3.4,
        expected: {
          raw: 3.4,
          boolean: undefined,
          date: new Date(3.4),
          number: 3.4,
          timestamp: new Date(3.4).getTime(),
          rgb: undefined
        }
      },
      {
        raw: 13.14,
        expected: {
          raw: 13.14,
          boolean: undefined,
          date: new Date(13.14),
          number: 13.14,
          timestamp: new Date(13.14).getTime(),
          rgb: undefined
        }
      }
    ];

    // Init
    let datas = lazyInit(values);

    // Vérifications
    for (let i = 0, l = datas.length; i < l; ++i) {

      it(datas[i].asRaw() + ' asRaw', function () {
        if (isNaN(datas[i].asRaw()))
          expect(datas[i].asRaw()).toBeNaN();
        else
          expect(datas[i].asRaw()).toBe(values[i].expected.raw);
      });
      it(datas[i].asRaw() + ' asBoolean', function () {
        expect(datas[i].asBoolean()).toBe(values[i].expected.boolean); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asDateObject', function () {
        if (isNaN(datas[i].asRaw()))
          expect(datas[i].asDateObject().getTime()).toBeNaN();
        else
          expect(datas[i].asDateObject()).toEqual(values[i].expected.date);
      });
      it(datas[i].asRaw() + ' asNumber', function () {
          expect(datas[i].asNumber()).toBe(values[i].expected.number);
      });
      it(datas[i].asRaw() + ' asRgb ', function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asTimestamp', function () {
        if (isNaN(datas[i].asRaw()))
          expect(isNaN(datas[i].asTimestamp())).toBe(true);
        else
          expect(datas[i].asTimestamp()).toBe(values[i].expected.timestamp);
      });
    }
  }); // FIN Number

  describe('Initialisé avec Boolean', function () {
    // Valeurs à tester
    let values = [
      {
        raw: true,
        expected: {
          raw: true,
          boolean: true,
          date: undefined,
          number: 1,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: false,
        expected: {
          raw: false,
          boolean: false,
          date: undefined,
          number: 0,
          timestamp: undefined,
          rgb: undefined
        }
      }
    ];

    // Init
    let datas = lazyInit(values);

    // Vérifications
    for (let i = 0, l = datas.length; i < l; ++i) {

      it(datas[i].asRaw() + ' asRaw', function () {
        expect(datas[i].asRaw()).toBe(values[i].expected.raw);
      });
      it(datas[i].asRaw() + ' asBoolean', function () {
        expect(datas[i].asBoolean()).toBe(values[i].expected.boolean); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asDateObject', function () {
        expect(datas[i].asDateObject()).toEqual(values[i].expected.date); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asNumber', function () {
        expect(datas[i].asNumber()).toBe(Number(values[i].expected.number));
      });
      it(datas[i].asRaw() + ' asRgb ', function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asTimestamp', function () {
        expect(datas[i].asTimestamp()).toBe(values[i].expected.timestamp);
      });
    }
  }); // FIN Boolean

  describe('Initialisé avec String', function () {
    // Valeurs à tester
    let values = [
      {
        raw: '',
        expected: {
          raw: '',
          boolean: undefined,
          date: undefined,
          number: 0,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: 'aze',
        expected: {
          raw: 'aze',
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '3',
        expected: {
          raw: '3',
          boolean: undefined,
          date: undefined,
          number: 3,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '-3',
        expected: {
          raw: '-3',
          boolean: undefined,
          date: undefined,
          number: -3,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '-5.5',
        expected: {
          raw: '-5.5',
          boolean: undefined,
          date: undefined,
          number: -5.5,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '3.33',
        expected: {
          raw: '3.33',
          boolean: undefined,
          date: undefined,     // JAMAIS 2 chiffres après la virgule (et 1 est ignoré) en {String}
          number: 3.33,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: 'true',
        expected: {
          raw: 'true',
          boolean: true,
          date: undefined,     // new Date("true") == [Invalid Date] !== new Date({boolean})
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: 'false',
        expected: {
          raw: 'false',
          boolean: false,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '#42',
        expected: {
          raw: '#42',
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '42#',
        expected: {
          raw: '42#',
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '0',
        expected: {
          raw: '0',
          boolean: false,
          date: undefined,
          number: 0,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '1',
        expected: {
          raw: '1',
          boolean: true,
          date: undefined,
          number: 1,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '32,5',      // virgule au lieu de point
        expected: {
          raw: '32,5',
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: '2019-04-26T14:02:21.566Z',      // seule façon qui permet de déclarer une Date (ISO)
        expected: {
          raw: '2019-04-26T14:02:21.566Z',
          boolean: undefined,
          date: new Date('2019-04-26T14:02:21.566Z'),
          number: undefined,
          timestamp: new Date('2019-04-26T14:02:21.566Z').getTime(),
          rgb: undefined
        }
      }
    ];

    // Init
    let datas = lazyInit(values);

    // Vérifications
    for (let i = 0, l = datas.length; i < l; ++i) {
      it(datas[i].asRaw() + ' asRaw', function () {
        expect(datas[i].asRaw()).toBe(values[i].expected.raw);
      });
      it(datas[i].asRaw() + ' asBoolean', function () {
        expect(datas[i].asBoolean()).toBe(values[i].expected.boolean);
      });
      it(datas[i].asRaw() + ' asDateObject', function () {
        if (values[i].expected.date === undefined)
          expect(datas[i].asDateObject()).toBeUndefined();
        else
          expect(datas[i].asDateObject()).toEqual(jasmine.any(Date));
        //expect(datas[i].asDateObject()).toEqual(values[i].expected.date);
      });
      it(datas[i].asRaw() + ' asNumber', function () {
        expect(datas[i].asNumber()).toBe(values[i].expected.number);
      });
      it(datas[i].asRaw() + ' asRgb ', function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb);
      });
      it(datas[i].asRaw() + ' asTimestamp', function () {
        if (values[i].expected.timestamp === undefined)
          expect(datas[i].asTimestamp()).toBeUndefined();
        else
          expect(datas[i].asTimestamp()).toEqual(jasmine.any(Number));
        //expect(datas[i].asTimestamp()).toBe(values[i].expected.timestamp);  //comparer des Dates est précis à la ms près... donc mauvaise idée
      });
    }
  }); // FIN String

  describe('Initialisé avec Objet', function () {
    let newDate = new Date();
    // Valeurs à tester
    let values = [
      {
        raw: { titi: "toto" },
        expected: {
          raw: { titi: "toto" },
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: NaN,
        expected: {
          raw: NaN,
          boolean: undefined,
          date: new Date(NaN),
          number: undefined,
          timestamp: new Date(NaN).getTime(),
          rgb: undefined
        }
      },
      {
        raw: undefined,
        expected: {
          raw: undefined,
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: null,
        expected: {
          raw: null,
          boolean: undefined,
          date: undefined,
          number: undefined,
          timestamp: undefined,
          rgb: undefined
        }
      },
      {
        raw: newDate,
        expected: {
          raw: newDate,
          boolean: undefined,
          date: newDate,
          number: newDate.getTime(),
          timestamp: newDate.getTime(),
          rgb: undefined
        }
      },
    ];

    // Init
    let datas = lazyInit(values);

    // Vérifications
    for (let i = 0, l = datas.length; i < l; ++i) {

      it(datas[i].asRaw() + ' asRaw(=' + datas[i].asRaw() + ")", function () {
        if (isNaN(datas[i].asRaw()) && datas[i].asRaw() !== undefined && typeof datas[i].asRaw() !== "object")
          expect(datas[i].asRaw()).toBeNaN();
        else
          expect(datas[i].asRaw()).toEqual(values[i].expected.raw);
      });
      it(datas[i].asRaw() + ' asBoolean(expected:' + datas[i].asBoolean() + ")", function () {
        expect(datas[i].asBoolean()).toBe(values[i].expected.boolean);
      });
      it(datas[i].asRaw() + ' asDateObject expects ' + values[i].expected.date + '(is: ' + datas[i].asDateObject() + ")", function () {
        if (datas[i].asRaw() instanceof Date)   //new Date(null) == new Date(0) == 1970....
          expect(datas[i].asDateObject().getTime()).toEqual(values[i].expected.date.getTime());
        else if (isNaN(datas[i].asRaw()))
          expect(isNaN(datas[i].asDateObject())).toBe(true);
        else
          expect(datas[i].asDateObject()).toBeUndefined();
      });
      it(datas[i].asRaw() + ' asNumber(=' + datas[i].asNumber() + ")", function () {
        expect(datas[i].asNumber()).toBe(values[i].expected.number);
      });
      it(datas[i].asRaw() + ' asRgb(=' + datas[i].asRgb() + ")", function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asTimestamp(=' + datas[i].asTimestamp() + ")", function () {
        if (isNaN(datas[i].asRaw()))
          expect(isNaN(datas[i].asTimestamp())).toBe(true);
        else
          expect(datas[i].asTimestamp()).toBe(values[i].expected.timestamp);
      });
    }
  }); // FIN Objet

  /**
     * Initialise plusieurs OrisDatas à partir d'un array
     * @param values
     * @return {Array}
     */
  function lazyInit(values) {
      let datas = [];
      for (let i = 0, l = values.length; i < l; ++i) {
        datas.push(new OrisData(values[i].raw));
      }
      return datas;
    }
});
