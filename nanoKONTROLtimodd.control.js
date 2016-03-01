/*TODO
 * pop-up for parameter group names and device names when new one is selected
 * auto focus current scene (if possible)
 */

loadAPI(1);

host.defineController("Korg","nanoKONTROL","2.0","E74ABCE1-7BA8-4526-A769-25A7E1F8212F","timodified");
host.defineMidiPorts(1,1);
var ECHO_ID = "12";
host.defineSysexIdentityReply("F0 42 50 01 ?? " + ECHO_ID + " 04 01 00 00 ?? ?? ?? ?? F7");
host.addDeviceNameBasedDiscoveryPair(["nanoKONTROL"],["nanoKONTROL"]);
host.addDeviceNameBasedDiscoveryPair(["nanoKONTROL SLIDER/KNOB"],["nanoKONTROL CTRL"]);
host.addDeviceNameBasedDiscoveryPair(["nanoKONTROL 1 SLIDER/KNOB"],["nanoKONTROL 1 CTRL"]);
host.addDeviceNameBasedDiscoveryPair(["USB audio device"],["USB audio device"]);

//var SYSEX_HEADER = "F0 42 40 00 01 04 00"; // needed?
var rec = 44;
var play = 45;
var stop = 46;
var rew = 47;
var ff = 48;
var loop = 49;
var slider = [2,3,4,5,6,8,9,12];
var knob = [14,15,16,17,18,19,20,21];
var button1to8 = [23,24,25,26,27,28,29,30];
var button10to17 = [33,34,35,36,37,38,39,40];
var slider9 = 13;
var knob9 = 22;
var button9 = 31;
var button18 = 41;
var knob_object = ["pan","send1","send2","send3","parameters","envelopes","common","macros"];
var slider_object = ["volume","send1","send2","send3","parameters","envelopes","common","macros"];
var isShift18 = false;
var isShift9 = false;
var isLoopButton = false;
var activeSliderObj = "macros";
var activeKnobObj = "common";
var parameterPageNames = [];
var activeParameterPageName = "";
var pendingParameterPageName = "";
var activeParameterPage = -1;
var isActive = false;
var tempo =
{
setT1: function()
{
   tempo.t1 = tempo.fromProj;
},
setT2: function(t)
{
   tempo.t2 = t;
},
initButton: function()
{
   tempo.setT1();
   tempo.setT2toHalf();
},
setT2toHalf: function()
{
   var tp = (tempo.fromProj * 0.5) - 20;
   tempo.setT2(tp < 0 ? 0 : tp);
   host.showPopupNotification("Loop: " + (tempo.t2 + 20) + " BPM");
},
setT2toQuarter: function()
{
   var tp = (tempo.fromProj * 0.25) - 20;
   tempo.setT2(tp < 0 ? 0 : tp);
   host.showPopupNotification("Loop: " + (tempo.t2 + 20) + " BPM");
},
setT2toDouble: function()
{
   var tp = (tempo.fromProj * 2) - 20;
   tempo.setT2(tp > 646 ? 646 : tp);
   host.showPopupNotification("Loop: " + (tempo.t2 + 20) + " BPM");
}
};

function init()
{
   host.getMidiInPort(0).setMidiCallback(onMidi);
   // //////////////////////////////////////// host sections
   transport = host.createTransport();
   app = host.createApplication();
   trackBank = host.createMainTrackBank(8,3,1);
   cursorTrack = host.createCursorTrack(3,1);
   master = host.createMasterTrack(0);
   // ////////////////////////////////////////////////
   // sendSysex(SYSEX_HEADER + "1F 10 00 F7"); //sysex dump request
   transport.getTempo().addValueDisplayObserver(3,"",function(t)
   {
      tempo.fromProj = parseInt(t);
      if (!isLoopButton)
      {
         tempo.setT1();
      };
   });
   initIndications();
   cursorTrack.getPrimaryDevice().addSelectedPageObserver(-1,function(i)
   {
      activeParameterPage = i;
   });
   cursorTrack.getPrimaryDevice().addPageNamesObserver(function()
   {
      parameterPageNames = arguments;// not working correctly
   })
   app.addHasActiveEngineObserver(function(active_state)
   {
      isActive = active_state;
   });
   if (!tempo.fromProj)
   {
      host.scheduleTask(tempo.initButton,null,100);
   }
   host.showPopupNotification("init nanoKONTROL");
}

function exit()
{
   host.showPopupNotification("exit nanoKONTROL");
}

function onMidi(status, data1, data2)
{
   var val = data2;
   var i = 0;
   // printMidi(status, data1, data2);
   if (slider.indexOf(data1) >= 0)
   {
      i = slider.indexOf(data1);
      getSliderObj(i).set(data2,128);
   }
   else if (knob.indexOf(data1) >= 0)
   {
      i = knob.indexOf(data1);
      getKnobObj(i).set(data2,128);
   }
   else if (data1 === button9)
   {
      isShift9 = data2 > 0;
   }
   else if (data1 === button18)
   {
      isShift18 = data2 > 0;
   }
   else if (data1 === loop)
   {
      isLoopButton = data2 > 0;
   }
   /*
    * *********** different shift states
    */
   /*
    * no Shift
    */
   if (!isShift9 && !isShift18)
   {
      if (data1 === knob9 && !isLoopButton)
      {
         transport.getTempo().set(val + 40,647);
         host.scheduleTask(tempo.setT1,null,50);
      }
      else if (data1 === knob9 && isLoopButton)
      {
         tempo.setT2(val * 2);
         transport.getTempo().set((val * 2),647);
      }
      else if (data1 === slider9)
      {
         transport.getCrossfade().set(data2,128);
      }
      else if (button1to8.indexOf(data1) >= 0 && val > 0)
      {
         i = button1to8.indexOf(data1);
         trackBank.getChannel(i).select();
      }
      else if (button10to17.indexOf(data1) >= 0 && val > 0)
      {
         i = button10to17.indexOf(data1);
         trackBank.getTrack(i).getClipLauncher().launch(0);
      }
      else if (val > 0)
      {
         switch (data1)
         {
         case play:
            trackBank.launchScene(0);
            trackBank.scrollScenesDown();
            break;
         case stop:
            transport.returnToArrangement();
            transport.resetAutomationOverrides();
            break;
         case rec:
            cursorTrack.getArm().toggle();
            break;
         case rew:
            trackBank.scrollScenesUp();
            break;
         case ff:
            trackBank.scrollScenesDown();
            break;
         case loop:
            transport.getTempo().set((tempo.t2),647);
            break;
         }
      }
      else if (data1 === loop && val === 0) // no Shift, release loop button
      {
         transport.getTempo().set((tempo.t1 - 20),647);
      }
      else if (data1 === button9 && val === 0 && tempo.t1 != tempo.fromProj) // release Button9, changed tempo
      {
         transport.getTempo().set((tempo.t1 - 20),647);
      }
      else if (data1 === button18 && val === 0 && tempo.t1 != tempo.fromProj) // release Button9, changed tempo
      {
         transport.getTempo().set((tempo.t1 - 20),647);
      }
   }
   /*
    * shift9
    */
   else if (isShift9 && !isShift18)
   {
      if (data1 === knob9 && !isLoopButton)
      {
         tempo.t1 = val + 60;
         host.showPopupNotification("set " + tempo.t1 + " BPM");
      }
      else if (button1to8.indexOf(data1) >= 0 && val > 0)
      {
         i = button1to8.indexOf(data1);
         if (activeKnobObj != knob_object[i])
         {
            if (knob_object[i] != "parameters" || activeSliderObj != "parameters")
            {
               setKnobObj(i);
               host.showPopupNotification("knobs: " + activeKnobObj);
            }
         }
         else
            host.showPopupNotification("knobs: " + activeKnobObj);
      }
      else if (button10to17.indexOf(data1) >= 0 && val > 0)
      {
         i = button10to17.indexOf(data1);
         if (activeSliderObj != slider_object[i])
         {
            if (slider_object[i] != "parameters" || activeKnobObj != "parameters")
            {
               setSliderObj(i);
               host.showPopupNotification("sliders: " + activeSliderObj);
            }
         }
         else
            host.showPopupNotification("sliders: " + activeSliderObj);
      }
      else if (val > 0)
      {
         switch (data1)
         {
         case play:
            transport.restart();
            break;
         case stop:
            transport.stop();
            break;
         case rec:
            transport.record();
            break;
         case rew:
            transport.rewind();
            break;
         case ff:
            transport.fastForward();
            break;
         case loop:
            tempo.setT2toDouble();
            break;
         }
      }
   }
   /*
    * shift18
    */
   else if (!isShift9 && isShift18)
   {
      if (data1 === knob9)
      {
         transport.getTempo().set(val * 3,647);
         host.scheduleTask(tempo.setT1,null,50);
      }
      if (button1to8.indexOf(data1) >= 0 && val > 0)
      {
         i = button1to8.indexOf(data1);
         trackBank.getChannel(i).getSolo().toggle();
      }
      else if (button10to17.indexOf(data1) >= 0 && val > 0)
      {
         i = button10to17.indexOf(data1);
         switch (i + 1)
         {
         case 1:
            cursorTrack.getPrimaryDevice().switchToPreviousPreset();
            break;
         case 2:
            cursorTrack.getPrimaryDevice().switchToNextPreset();
            break;
         case 3:
            cursorTrack.getPrimaryDevice().switchToPreviousPresetCategory();
            break;
         case 4:
            cursorTrack.getPrimaryDevice().switchToNextPresetCategory();
            break;
         case 5:
            break;
         case 6:
            break;
         case 7:
            if (activeKnobObj == "parameters" || activeSliderObj == "parameters")
            {
               cursorTrack.getPrimaryDevice().previousParameterPage();
               // host.showPopupNotification(parameterPageNames[activeParameterPage]);
            }
            break;
         case 8:
            if (activeKnobObj == "parameters" || activeSliderObj == "parameters")
            {
               cursorTrack.getPrimaryDevice().nextParameterPage();
               // host.showPopupNotification(parameterPageNames[activeParameterPage]);
            }
            break;
         }
      }
      else if (val > 0)
      {
         switch (data1)
         {
         case play:
            transport.play();
            break;
         case stop:
            master.getMute().toggle();
            break;
         case rec:
            transport.record();
            break;
         case rew:
            cursorTrack.getPrimaryDevice().switchToDevice(DeviceType.ANY,ChainLocation.PREVIOUS);
            break;
         case ff:
            cursorTrack.getPrimaryDevice().switchToDevice(DeviceType.ANY,ChainLocation.NEXT);
            break;
         case loop:
            tempo.setT2toHalf();
            break;
         }
      }
      else if (data1 === stop && val === 0) // on stop button release
      {
         master.getMute().toggle();
      }
   }
   /*
    * both Shift9 & 18
    */
   else if (isShift9 && isShift18)
   {
      if (data1 === knob9)
      {
         tempo.t1 = val * 2 + 60;
         host.showPopupNotification("set " + tempo.t1 + " BPM");
         // cursorTrack.getPan().set(val,128);
      }
      else if (data1 === slider9)
      {
         // cursorTrack.getVolume().set(val,128);
      }
      if (button1to8.indexOf(data1) >= 0 && val > 0)
      {
         i = button1to8.indexOf(data1);
      }
      else if (button10to17.indexOf(data1) >= 0 && val > 0)
      {
         i = button10to17.indexOf(data1);
         trackBank.getTrack(i).getClipLauncher().returnToArrangement();
      }
      else if (val > 0)
      {
         switch (data1)
         {
         case play:
            isActive ? transport.restart() : app.activateEngine();
            break;
         case stop:
            master.getMute().toggle();
            break;
         case rec:
            transport.record();
            break;
         case rew:
            trackBank.scrollTracksPageUp();
            break;
         case ff:
            trackBank.scrollTracksPageDown();
            break;
         case loop:
            transport.toggleLoop();
            break;
         }
      }
   }
}

var setSliderObj = function(i)
{
   if (activeKnobObj != activeSliderObj)
   {
      for (var j = 0; j < 8; j++)
      {
         getSliderObj(j).setIndication(false);
      }
   }
   activeSliderObj = slider_object[i];
   for (var j = 0; j < 8; j++)
   {
      getSliderObj(j).setIndication(true);
   }
}

var setKnobObj = function(i)
{
   if (activeSliderObj != activeKnobObj)
   {
      for (var j = 0; j < 8; j++)
      {
         getKnobObj(j).setIndication(false);
      }
   }
   activeKnobObj = knob_object[i];
   for (var j = 0; j < 8; j++)
   {
      getKnobObj(j).setIndication(true);
   }
}

var getSliderObj = function(i)
{
   switch (activeSliderObj)
   {
   case "macros":
      return cursorTrack.getPrimaryDevice().getMacro(i).getAmount();
      break;
   case "parameters":
      return cursorTrack.getPrimaryDevice().getParameter(i);
      break;
   case "common":
      return cursorTrack.getPrimaryDevice().getCommonParameter(i);
      break;
   case "envelopes":
      return cursorTrack.getPrimaryDevice().getEnvelopeParameter(i);
      break;
   case "volume":
      return trackBank.getChannel(i).getVolume();
      break;
   case "send1":
      return trackBank.getChannel(i).getSend(0);
      break;
   case "send2":
      return trackBank.getChannel(i).getSend(1);
      break;
   case "send3":
      return trackBank.getChannel(i).getSend(2);
      break;
   }
}

var getKnobObj = function(i)
{
   switch (activeKnobObj)
   {
   case "macros":
      return cursorTrack.getPrimaryDevice().getMacro(i).getAmount();
      break;
   case "parameters":
      return cursorTrack.getPrimaryDevice().getParameter(i);
      break;
   case "common":
      return cursorTrack.getPrimaryDevice().getCommonParameter(i);
      break;
   case "envelopes":
      return cursorTrack.getPrimaryDevice().getEnvelopeParameter(i);
      break;
   case "pan":
      return trackBank.getChannel(i).getPan();
      break;
   case "send1":
      return trackBank.getChannel(i).getSend(0);
      break;
   case "send2":
      return trackBank.getChannel(i).getSend(1);
      break;
   case "send3":
      return trackBank.getChannel(i).getSend(2);
      break;
   }
}

var initIndications = function()
{
   for (var i = 0; i < 8; i++)
   {
      getKnobObj(i).setIndication(true);
      getSliderObj(i).setIndication(true);
      trackBank.getChannel(i).getClipLauncherSlots().setIndication(true);
   }
}