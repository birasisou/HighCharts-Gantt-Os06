describe('Oris Gantt Task Model', function () {
  let today = new Date(),
    orisConfig = undefined,
    day = 1000 * 60 * 60 * 24,  // 24 heures en timestamp (ms)
    end = new Date(today.getTime() + 5 * day),
    DATA = {
      emptyString: '',
      undefined: undefined,
      null: null,

      id: {
        asString: "id-valid",
        asNumber: 0
      },

      start: {
        asString: today.toISOString(),
        asGMT: today.toString(), // GMT+02
        asNumber: today.getTime(), // on ne supporte pas les timestamp parce qu'on n'a que des Zulu
        asDate: new Date(today)
      },

      end: {
        asString: end.toISOString(),
        asGMT: end.toString(), // GMT+02
        asNumber: end.getTime(),
        asDate: end
      },

      true: {
        asString: "true",
        asNumber: 1,
        asBoolean: true
      },

      false: {
        asString: "false",
        asNumber: 0,
        asBoolean: false
      }
    };

  beforeEach(function () {
    // LoggerModule.setDebug("error");
    orisConfig = new ParametresUrlOris("http://www.on_en_a_gros.fr:8080/id-000192.168.1.74424011-0/index.html?data=root_gestion.ini&id=col-id&start=col-start&end=col-end&is-milestone=col-milestone");
  });

  describe('Should be invalid', function () {
    // ID
    it('if ID is missing', function () {
      // No ID
      let noIdData = {

          "col-start": DATA.start.asString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        noIdGanttTask = new OrisGanttTask(noIdData, orisConfig);

      expect(noIdGanttTask.isValidTask()).toBe(false);

      expect(noIdGanttTask.userOptions['id']).toBeUndefined();
      expect(noIdGanttTask.userOptions['start']).toBeTruthy();
      expect(noIdGanttTask.userOptions['end']).toBeTruthy();
      expect(noIdGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if ID is empty', function () {
      // Empty ID
      let emptyIdData = {
          "col-id": DATA.emptyString,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        emptyIdGanttTask = new OrisGanttTask(emptyIdData, orisConfig);

      expect(emptyIdGanttTask.isValidTask()).toBe(false);

      expect(emptyIdGanttTask.userOptions['id']).toBeFalsy();
      expect(emptyIdGanttTask.userOptions['start']).toBeTruthy();
      expect(emptyIdGanttTask.userOptions['end']).toBeTruthy();
      expect(emptyIdGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if ID is undefined', function () {
      // undefined ID
      let undefinedIdData = {
          "col-id": DATA.undefined,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        undefinedIdTask = new OrisGanttTask(undefinedIdData, orisConfig);
      expect(undefinedIdTask.isValidTask()).toBe(false);

      expect(undefinedIdTask.userOptions['id']).toBeFalsy();
      expect(undefinedIdTask.userOptions['start']).toBeTruthy();
      expect(undefinedIdTask.userOptions['end']).toBeTruthy();
      expect(undefinedIdTask.userOptions['milestone']).toBeFalsy();
    });
    it('if ID is null', function () {
      // null ID
      let nullIdData = {
          "col-id": DATA.null,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        nullIdTask = new OrisGanttTask(nullIdData, orisConfig);

      expect(nullIdTask.isValidTask()).toBe(false);

      expect(nullIdTask.userOptions['id']).toBeFalsy();
      expect(nullIdTask.userOptions['start']).toBeTruthy();
      expect(nullIdTask.userOptions['end']).toBeTruthy();
      expect(nullIdTask.userOptions['milestone']).toBeFalsy();
    });
    // TODO interdire les nombres mais JSON est forcément en STRING donc osef

    // START
    it('if START is missing', function () {
      // Missing START date
      let noStartData = {
          "col-id": DATA.id.asString,

          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        noStartGanttTask = new OrisGanttTask(noStartData, orisConfig);

      expect(noStartGanttTask.isValidTask()).toBe(false);

      expect(noStartGanttTask.userOptions['id']).toBeTruthy();
      expect(noStartGanttTask.userOptions['start']).toBeFalsy();
      expect(noStartGanttTask.userOptions['end']).toBeTruthy();
      expect(noStartGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if START is empty', function () {
      let emptyStartData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.emptyString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        emptyStartGanttTask = new OrisGanttTask(emptyStartData, orisConfig);

      expect(emptyStartGanttTask.isValidTask()).toBe(false);

      expect(emptyStartGanttTask.userOptions['id']).toBeTruthy();
      expect(emptyStartGanttTask.userOptions['start']).toBeFalsy();
      expect(emptyStartGanttTask.userOptions['end']).toBeTruthy();
      expect(emptyStartGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if START is undefined', function () {
      let undefinedStartData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.undefined,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.false.asString
        },
        undefinedStartTask = new OrisGanttTask(undefinedStartData, orisConfig);

      expect(undefinedStartTask.isValidTask()).toBe(false);

      expect(undefinedStartTask.userOptions['id']).toBeTruthy();
      expect(undefinedStartTask.userOptions['start']).toBeFalsy();
      expect(undefinedStartTask.userOptions['end']).toBeTruthy();
      expect(undefinedStartTask.userOptions['milestone']).toBeFalsy();
    });
    it('if START is null', function () {
      let nullStartData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.null,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        nullStartTask = new OrisGanttTask(nullStartData, orisConfig);

      expect(nullStartTask.isValidTask()).toBe(false);

      expect(nullStartTask.userOptions['id']).toBeTruthy();
      expect(nullStartTask.userOptions['start']).toBeFalsy();
      expect(nullStartTask.userOptions['end']).toBeTruthy();
      expect(nullStartTask.userOptions['milestone']).toBeFalsy();
    });
    it('if START is invalid', function () {
      let invalidStartData = {
          "col-id": DATA.id.asString,
          "col-start": "aze",
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        invalidStartTask = new OrisGanttTask(invalidStartData, orisConfig);

      expect(invalidStartTask.isValidTask()).toBe(false);

      expect(invalidStartTask.userOptions['id']).toBeTruthy();
      expect(invalidStartTask.userOptions['start']).toBeFalsy();
      expect(invalidStartTask.userOptions['end']).toBeTruthy();
      expect(invalidStartTask.userOptions['milestone']).toBeFalsy();
    });
    it('if START is OK (string) but not ISO-8601 (Zulu time)', function () {
      let notIsoStartData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asGMT,   // timestamp !== Zulu ISO
          "col-end": DATA.end.asString,
          "col-milestone": DATA.undefined
        },
        notIsoStartTask = new OrisGanttTask(notIsoStartData, orisConfig);

      expect(notIsoStartTask.isValidTask()).toBe(false);

      expect(notIsoStartTask.userOptions['id']).toBeTruthy();
      expect(notIsoStartTask.userOptions['start']).toBeFalsy();
      expect(notIsoStartTask.userOptions['end']).toBeTruthy();
      expect(notIsoStartTask.userOptions['milestone']).toBeFalsy();
    });

    // END
    it('if END is missing', function () {
      // Missing START date
      let noEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,

          "col-milestone": DATA.false.asString
        },
        noEndGanttTask = new OrisGanttTask(noEndData, orisConfig);

      expect(noEndGanttTask.isValidTask()).toBe(false);

      expect(noEndGanttTask.userOptions['id']).toBeTruthy();
      expect(noEndGanttTask.userOptions['start']).toBeTruthy();
      expect(noEndGanttTask.userOptions['end']).toBeFalsy();
      expect(noEndGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is empty', function () {
      let emptyEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.emptyString,
          "col-milestone": DATA.false.asString
        },
        emptyEndGanttTask = new OrisGanttTask(emptyEndData, orisConfig);

      expect(emptyEndGanttTask.isValidTask()).toBe(false);

      expect(emptyEndGanttTask.userOptions['id']).toBeTruthy();
      expect(emptyEndGanttTask.userOptions['start']).toBeTruthy();
      expect(emptyEndGanttTask.userOptions['end']).toBeFalsy();
      expect(emptyEndGanttTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is undefined', function () {
      let undefinedEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.undefined,
          "col-milestone": DATA.false.asString
        },
        undefinedEndTask = new OrisGanttTask(undefinedEndData, orisConfig);

      expect(undefinedEndTask.isValidTask()).toBe(false);

      expect(undefinedEndTask.userOptions['id']).toBeTruthy();
      expect(undefinedEndTask.userOptions['start']).toBeTruthy();
      expect(undefinedEndTask.userOptions['end']).toBeFalsy();
      expect(undefinedEndTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is null', function () {
      let nullEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.null,
          "col-milestone": DATA.false.asString
        },
        nullEndTask = new OrisGanttTask(nullEndData, orisConfig);

      expect(nullEndTask.isValidTask()).toBe(false);

      expect(nullEndTask.userOptions['id']).toBeTruthy();
      expect(nullEndTask.userOptions['start']).toBeTruthy();
      expect(nullEndTask.userOptions['end']).toBeFalsy();
      expect(nullEndTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is invalid', function () {
      let invalidEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": "aze",
          "col-milestone": DATA.false.asString
        },
        invalidEndTask = new OrisGanttTask(invalidEndData, orisConfig);

      expect(invalidEndTask.isValidTask()).toBe(false);

      expect(invalidEndTask.userOptions['id']).toBeTruthy();
      expect(invalidEndTask.userOptions['start']).toBeTruthy();
      expect(invalidEndTask.userOptions['end']).toBeFalsy();
      expect(invalidEndTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is OK (string) not ISO-8601 (Zulu time)', function () {
      let notIsoEndData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asGMT,   // timestamp !== Zulu ISO
          "col-milestone": DATA.undefined
        },
        notIsoEndTask = new OrisGanttTask(notIsoEndData, orisConfig);

      expect(notIsoEndTask.isValidTask()).toBe(false);

      expect(notIsoEndTask.userOptions['id']).toBeTruthy();
      expect(notIsoEndTask.userOptions['start']).toBeTruthy();
      expect(notIsoEndTask.userOptions['end']).toBeFalsy();
      expect(notIsoEndTask.userOptions['milestone']).toBeFalsy();
    });

    it('if END is LESS THAN START value', function () {
      let endLessThanStartData = {
          "col-id": "ALED",
          "col-start": DATA.end.asString,
          "col-end": DATA.start.asString,
          "col-milestone": DATA.false.asString
        },
        endLessThanStartTask = new OrisGanttTask(endLessThanStartData, orisConfig);

      expect(endLessThanStartTask.isValidTask()).toBe(false);

      expect(endLessThanStartTask.userOptions['id']).toBeTruthy();
      expect(endLessThanStartTask.userOptions['start']).toBeTruthy();
      expect(endLessThanStartTask.userOptions['end']).toBeTruthy();
      expect(endLessThanStartTask.userOptions['start']).toBeGreaterThan(endLessThanStartTask.userOptions['end']);
      expect(endLessThanStartTask.userOptions['milestone']).toBeFalsy();
    });
    it('if END is OK but IS-MILESTONE is also set to true', function () {
      let endAndMilestoneData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asString,
          "col-milestone": DATA.true.asString
        },
        endAndMilestoneTask = new OrisGanttTask(endAndMilestoneData, orisConfig);

      expect(endAndMilestoneTask.isValidTask()).toBe(false);
      expect(endAndMilestoneTask.userOptions['id']).toBeTruthy();
      expect(endAndMilestoneTask.userOptions['start']).toBeTruthy();
      expect(endAndMilestoneTask.userOptions['end']).toBeTruthy();
      expect(endAndMilestoneTask.userOptions['milestone']).toBeTruthy();
    });
    it('if both END and IS-MILESTONE are invalid/false (END invalid but !IS-MILESTONE)', function () {
      let endAndMilestoneData = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.undefined,
          "col-milestone": DATA.null
        },
        endAndMilestoneTask = new OrisGanttTask(endAndMilestoneData, orisConfig);

      expect(endAndMilestoneTask.isValidTask()).toBe(false);
      expect(endAndMilestoneTask.userOptions['id']).toBeTruthy();
      expect(endAndMilestoneTask.userOptions['start']).toBeTruthy();
      expect(endAndMilestoneTask.userOptions['end']).toBeFalsy();
      expect(endAndMilestoneTask.userOptions['milestone']).toBeFalsy();
    });

    it('if object is empty', function () {
      let emptyObj = {},
        emptyObjTask = new OrisGanttTask(emptyObj, orisConfig);

      expect(emptyObjTask.isValidTask()).toBe(false);
      expect(emptyObjTask.userOptions['id']).toBeUndefined();
      expect(emptyObjTask.userOptions['start']).toBeUndefined();
      expect(emptyObjTask.userOptions['end']).toBeUndefined();
      expect(emptyObjTask.userOptions['milestone']).toBeUndefined();
    });

    it('if an argument is undefined (throws)', function () {
      let undefinedObj = undefined;
      expect(function () { new OrisGanttTask(undefined, orisConfig) }).toThrow();
      expect(function () { new OrisGanttTask(undefinedObj, undefined) }).toThrow();
    });

    // TODO !!!!! TRY CATCH AILLEURS
    it('if an argument is missing', function () {

    });
  });

  describe('Should be valid', function () {
    it('if ID, START (string) and END (timestamp) are valid, START <= END and IS-MILESTONE is set to false', function () {
      let okNotMilestone = {
          "col-id": DATA.id.asNumber,
          "col-start": DATA.start.asNumber,
          "col-end": DATA.end.asNumber,
          "col-milestone": DATA.false.asString
        },
        okNotMilestoneTask = new OrisGanttTask(okNotMilestone, orisConfig);

      expect(okNotMilestoneTask.isValidTask()).toBe(true);

      expect(okNotMilestoneTask.userOptions['id']).toBeTruthy();
      expect(okNotMilestoneTask.userOptions['start']).toBeTruthy();
      expect(okNotMilestoneTask.userOptions['end']).toBeTruthy();
      expect(okNotMilestoneTask.userOptions['milestone']).toBeFalsy();
    });
    it('if ID, START are valid, END is unset/invalid and IS-MILESTONE is true', function () {
      let okMilestone = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.end.asGMT,
          "col-milestone": DATA.true.asString
        },
        okMilestoneTask = new OrisGanttTask(okMilestone, orisConfig);

      expect(okMilestoneTask.isValidTask()).toBe(true);

      expect(okMilestoneTask.userOptions['id']).toBeTruthy();
      expect(okMilestoneTask.userOptions['start']).toBeTruthy();
      expect(okMilestoneTask.userOptions['end']).toBeUndefined();
      expect(okMilestoneTask.userOptions['milestone']).toBeTruthy();

      let okMilestone2 = {
          "col-id": DATA.id.asString,
          "col-start": DATA.start.asString,
          "col-end": DATA.emptyString,
          "col-milestone": DATA.true.asString
        },
        okMilestoneTask2 = new OrisGanttTask(okMilestone2, orisConfig);

      expect(okMilestoneTask2.isValidTask()).toBe(true);

      expect(okMilestoneTask2.userOptions['id']).toBeTruthy();
      expect(okMilestoneTask2.userOptions['start']).toBeTruthy();
      expect(okMilestoneTask2.userOptions['end']).toBeUndefined();
      expect(okMilestoneTask2.userOptions['milestone']).toBeTruthy();
    });
  });
});
