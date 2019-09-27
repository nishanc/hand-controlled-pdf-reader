let url = prompt("Please enter document url:", "https://arxiv.org/pdf/1708.01967.pdf");
console.log("Page rendering....");
document.getElementsByTagName("body")[0].innerHTML = `<div id="switchbox" class="mb10">
        <center>
        <div class="title">&nbsp;Start Tracking&nbsp;</div>
        <label class="switch">
        <input type="checkbox" id="trackbutton" class="bx--btn bx--btn--secondary">
        <span class="slider round"></span>
        </label>
        <br><br>
        <button id="togglePipButton" class="button" style="vertical-align:middle"><span>Toggle</span></button>
        <br><br>
        <div id="loader">
        <label>Loading Model</label>
        <div class="loader" ></div>
        <br>
        <div id="loader2">
        <label>Loading Document</label>
        <div class="loader" ></div>
        </div>
        </center>
     </div>` + document.getElementsByTagName("body")[0].innerHTML;

// navigator.getUserMedia =  navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

let trackButton = document.getElementById("trackbutton");
let switchbox = document.getElementById("switchbox");
let modelLoader = document.getElementById("loader");
let docLoader = document.getElementById("loader2");
let togglePipButton = document.getElementById("togglePipButton");

let video = document.getElementById('video');
let canvas = document.getElementById('hcanvas');
let context = canvas.getContext('2d');

let model;
let videoWidth;
let videoMidpoint;
let isVideo = false;

var currPage = 1; //Pages are 1-based not 0-based
var numPages = 0;
var thePDF = null;
let scale = 2;

let loadingTask = pdfjsLib.getDocument("https://cors-anywhere.herokuapp.com/"+url);

const modelParams = {
  flipHorizontal: true,   // flip e.g for video 
  imageScaleFactor: 0.7,  // reduce input image size for gains in speed.
  maxNumBoxes: 20,        // maximum number of boxes to detect
  iouThreshold: 0.5,      // ioU threshold for non-max suppression
  scoreThreshold: 0.9,    // confidence threshold for predictions.
}

//-----------------------------------------------------//
//-------------------PDF.js----------------------------//
//-----------------------------------------------------//

loadingTask.promise.then(
  function(pdf) {
    //Set PDFJS global object (so we can easily access in our page functions
    thePDF = pdf;

    //How many pages it has
    numPages = pdf.numPages;

    //Start with first page
    pdf.getPage( 1 ).then( handlePages );
  },
  function(reason) {
    console.error(reason);
  }
);

function handlePages(page)
{
    //This gives us the page's dimensions at full scale
    let viewport = page.getViewport( scale );

    //We'll create a canvas for each page to draw it on
    let canvas = document.createElement( "canvas" );
    canvas.style.display = "block";
    let context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    //Draw it on the canvas
    page.render({
      canvasContext: context,
       viewport: viewport
      });

    //Add it to the web page
    document.body.appendChild( canvas );

    //Move to next page
    currPage++;
    if ( thePDF !== null && currPage <= numPages )
    {
        thePDF.getPage( currPage ).then( handlePages );
    } else{
      console.log("Page rendered!");
      docLoader.style.display="none";
    }
}

//-----------------------------------------------------//
//-------------------Handtrack-------------------------//
//-----------------------------------------------------//

function startVideo() {
  handTrack.startVideo(video).then(status => {
      if(status){
          videoWidth = document.getElementById("video").width;
          videoMidpoint = videoWidth / 2;
          isVideo = true;
          runDetection();
      }
  });
}

function toggleVideo() {
  if (!isVideo) {
      console.log("Starting");
      startVideo();
      togglePipButton.style.display = 'block';
  } else {
      console.log("Stopping");
      handTrack.stopVideo(video);
      isVideo = false;
      console.log("Stopped");
      togglePipButton.style.display = 'none';
  }
}

trackButton.addEventListener("click", function () {
  toggleVideo();
});

function runDetection(){
    model.detect(video).then(predictions => {
        model.renderPredictions(predictions, canvas, context, video);
        if (predictions[0]) {
            console.log(predictions);
            let x =  predictions[0].bbox[0];

            console.log('x',x)
            console.log('video width', videoWidth);
            console.log('video mid', videoMidpoint);
            updatePageControl(x);
        }
        requestAnimationFrame(runDetection);
    });
}

function updatePageControl(x) {
    if(x>videoMidpoint){
        console.log('right')
        window.scrollBy({ 
          top: 100, // scroll down by 100 px
          left: 0, 
          behavior: 'smooth' 
        });
    }
    if(x<videoMidpoint){
        console.log('left')
        window.scrollBy({ 
          top: -100, // scroll up by 100 px
          left: 0, 
          behavior: 'smooth' 
        });
    }
}

handTrack.load(modelParams).then(lmodel => {
    model = lmodel;
    modelLoader.style.display="none";
    trackButton.disabled = false;
});

//-----------------------------------------------------//
//----------Picture-in-Picture-------------------------//
//-----------------------------------------------------//

togglePipButton.addEventListener('click', async function(event) {
  togglePipButton.disabled = true;
  try {

    if (video !== document.pictureInPictureElement)
      await video.requestPictureInPicture();
    else
      await document.exitPictureInPicture();

  } catch(error) {
    console.log('error',error)
  } finally {
    togglePipButton.disabled = false;
  }
});

if ('pictureInPictureEnabled' in document) {
  // Set button ability depending on whether Picture-in-Picture can be used.
  setPipButton();
  video.addEventListener('loadedmetadata', setPipButton);
  video.addEventListener('emptied', setPipButton);
} else {
  // Hide button if Picture-in-Picture is not supported.
  togglePipButton.hidden = true;
}

function setPipButton() {
  togglePipButton.disabled = (video.readyState === 0) ||
                             !document.pictureInPictureEnabled ||
                             video.disablePictureInPicture;
}