describe("Modèle de donnée Oris", function () {
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
      expect(data.asBoolean()).toBeNull();
    });
    it(data.asRaw() + ' asDate', function () {
      expect(data.asDate()).toBeNull();
    });
    it(data.asRaw() + ' asNumber', function () {
      expect(data.asNumber()).toBeNull();
    });
    it(data.asRaw() + ' asRgb', function () {
      expect(data.asRgb()).toBeNull();
    });
    it(data.asRaw() + ' asTimestamp', function () {
      expect(data.asTimestamp()).toBeNull();
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
          timestamp: 0,
          rgb: null
        }
      },
      {
        raw: 1,
        expected: {
          raw: 1,
          boolean: true,
          date: new Date(1),
          number: 1,
          timestamp: 1,
          rgb: null
        }
      },
      {
        raw: NaN,
        expected: {
          raw: NaN,
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: -10,
        expected: {
          raw: -10,
          boolean: null,
          date: new Date(-10),
          number: -10,
          timestamp: -10,
          rgb: null
        }
      },
      {
        raw: -50.5,
        expected: {
          raw: -50.5,
          boolean: null,
          date: new Date(-50.5),
          number: -50.5,
          timestamp: -50,
          rgb: null
        }
      },
      {
        raw: 3.4,
        expected: {
          raw: 3.4,
          boolean: null,
          date: new Date(3.4),
          number: 3.4,
          timestamp: 3,
          rgb: null
        }
      },
      {
        raw: 13.14,
        expected: {
          raw: 13.14,
          boolean: null,
          date: new Date(13.14),
          number: 13.14,
          timestamp: 13,
          rgb: null
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
      it(datas[i].asRaw() + ' asDate', function () {
        expect(datas[i].asDate()).toEqual(values[i].expected.date); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asNumber', function () {
        if (isNaN(datas[i].asRaw()))
          expect(datas[i].asRaw()).toBeNaN();
        else
          expect(datas[i].asNumber()).toBe(Number(values[i].expected.number));
      });
      it(datas[i].asRaw() + ' asRgb ', function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asTimestamp', function () {
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
          date: new Date(1),
          number: 1,
          timestamp: 1,
          rgb: null
        }
      },
      {
        raw: false,
        expected: {
          raw: false,
          boolean: false,
          date: new Date(0),
          number: 0,
          timestamp: 0,
          rgb: null
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
      it(datas[i].asRaw() + ' asDate', function () {
        expect(datas[i].asDate()).toEqual(values[i].expected.date); // .toBe(NO_VALUE);
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
          boolean: null,
          date: null,
          number: 0,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: 'aze',
        expected: {
          raw: 'aze',
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: '3',
        expected: {
          raw: '3',
          boolean: null,
          date: new Date('3'),
          number: 3,
          timestamp: 983401200000,
          rgb: null
        }
      },
      {
        raw: '-3',
        expected: {
          raw: '-3',
          boolean: null,
          date: new Date('-3'),
          number: -3,
          timestamp: 983401200000,
          rgb: null
        }
      },
      {
        raw: '-5.5',
        expected: {
          raw: '-5.5',
          boolean: null,
          date: new Date('-5.5'),
          number: -5.5,
          timestamp: 989013600000,
          rgb: null
        }
      },
      {
        raw: '3.33',
        expected: {
          raw: '3.33',
          boolean: null,
          date: null,     // JAMAIS 2 chiffres après la virgule (et 1 est ignoré) en {String}
          number: 3.33,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: 'true',
        expected: {
          raw: 'true',
          boolean: true,
          date: null,     // new Date("true") == [Invalid Date] !== new Date({boolean})
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: 'false',
        expected: {
          raw: 'false',
          boolean: false,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: '#42',
        expected: {
          raw: '#42',
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: '42#',
        expected: {
          raw: '42#',
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: '0',
        expected: {
          raw: '0',
          boolean: false,
          date: new Date('0'),
          number: 0,
          timestamp: new Date('0').getTime(),
          rgb: null
        }
      },
      {
        raw: '1',
        expected: {
          raw: '1',
          boolean: true,
          date: new Date('1'),
          number: 1,
          timestamp: new Date('1').getTime(),
          rgb: null
        }
      },
      {
        raw: '32,5',      // virgule au lieu de point
        expected: {
          raw: '32,5',
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
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
      it(datas[i].asRaw() + ' asDate', function () {
        if (values[i].expected.date === null)
          expect(datas[i].asDate()).toBeNull();
        else
          expect(datas[i].asDate()).toEqual(jasmine.any(Date));
        //expect(datas[i].asDate()).toEqual(values[i].expected.date);
      });
      it(datas[i].asRaw() + ' asNumber', function () {
        expect(datas[i].asNumber()).toBe(values[i].expected.number);
      });
      it(datas[i].asRaw() + ' asRgb ', function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb);
      });
      it(datas[i].asRaw() + ' asTimestamp', function () {
        if (values[i].expected.timestamp === null)
          expect(datas[i].asTimestamp()).toBeNull();
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
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: NaN,
        expected: {
          raw: NaN,
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: undefined,
        expected: {
          raw: undefined,
          boolean: null,
          date: null,
          number: null,
          timestamp: null,
          rgb: null
        }
      },
      {
        raw: null,
        expected: {
          raw: null,
          boolean: null,
          date: new Date(null),
          number: null,
          timestamp: 0,
          rgb: null
        }
      },
      {
        raw: newDate,
        expected: {
          raw: newDate,
          boolean: null,
          date: newDate,
          number: newDate.getTime(),
          timestamp: newDate.getTime(),
          rgb: null
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
      it(datas[i].asRaw() + ' asDate expects ' + values[i].expected.date + '(is: ' + datas[i].asDate() + ")", function () {
        if (datas[i].asRaw() instanceof Date || datas[i].asRaw() === null)   //new Date(null) == new Date(0) == 1970....
          expect(datas[i].asDate().getTime()).toEqual(values[i].expected.date.getTime());
        else
          expect(datas[i].asDate()).toBeNull();
      });
      it(datas[i].asRaw() + ' asNumber(=' + datas[i].asNumber() + ")", function () {
        expect(datas[i].asNumber()).toBe(values[i].expected.number);
      });
      it(datas[i].asRaw() + ' asRgb(=' + datas[i].asRgb() + ")", function () {
        expect(datas[i].asRgb()).toBe(values[i].expected.rgb); // .toBe(NO_VALUE);
      });
      it(datas[i].asRaw() + ' asTimestamp(=' + datas[i].asTimestamp() + ")", function () {
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
