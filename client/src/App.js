import React from 'react';
import './App.css';
import RetrieveData from './RetrieveData';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.organism = '';
    this.retmax = 0;
    this.indexRange = 0;
    this.indexPos = 0;
  };

  init() {
    if (window.location.search !== '' && window.location.search.split('?').length > 1) {
      var paramSplit = window.location.search.split('?')[1].split('&');
      for (var s = 0; s < paramSplit.length; s++) {
        var splitParamsEvenMore = paramSplit[s].split('=');
        if (splitParamsEvenMore.length > 1) {
          var paramName = splitParamsEvenMore[0].toLowerCase();
          var paramInput = splitParamsEvenMore[1];
          if (paramName === 'organism' || paramName === 'organisms') {
            this.organism = paramInput;
          } else if (paramName === 'retmax') {
            this.retmax = parseInt(paramInput);
          } else if (paramName === 'indexrange') {
            this.indexRange = parseInt(paramInput);
          } else if (paramName === 'indexpos') {
            this.indexPos = parseInt(paramInput);
          };
        };
      };
      if (this.organism !== '' && this.retmax !== 0 && this.indexRange !== 0 && this.indexPos >= 0) {
        var retrieveData = new RetrieveData();
        retrieveData.init(this.organism, this.retmax, this.indexRange, this.indexPos);
      };
    };
  };

  handleClick(e) {
    e.preventDefault();

    let organism = document.getElementById('organism').value.split(' ').join('_');
    if (organism.trim() === '') {
      let organism = 'Arabidopsis thaliana';
      document.getElementById('organism').value = organism;
    };

    let retmax = parseInt(document.getElementById('retmax').value);
    if (isNaN(retmax)) {
      let retmax = 100;
      document.getElementById('retmax').value = retmax;
    };
    
    let indexRange = parseInt(document.getElementById('indexRange').value);
    if (isNaN(indexRange)) {
      let indexRange = 100;
      document.getElementById('indexRange').value = indexRange;
    };    
    
    var retrieveData = new RetrieveData();
    retrieveData.init(organism, retmax, indexRange, 0);
  };

  /**
   * Find the maximum number of publications for a species
   */
  async findMaxSpecies() {
    let organism = document.getElementById('organism').value.split(' ').join('_');
    if (organism.trim() === "") {
      organism = 'Arabidopsis thaliana';
      document.getElementById('organism').value = 'Arabidopsis thaliana';
    };

    var retrieveData = new RetrieveData();
    var retrieveMaxPapers = retrieveData.retrieveMaxPaperCount(organism);
    await retrieveMaxPapers;
    var maxPaperCount = retrieveData.maxPapers;

    document.getElementById('retmax').value = maxPaperCount;
    if (maxPaperCount >= 100) {
      document.getElementById('indexRange').value = 100;
    } else {
      document.getElementById('indexRange').value = maxPaperCount;
    };
  };

  render() {
    this.init();
    return (
      <div>
        <div className="App">
          You need an internet connection for this script to work. If you cannot see the cat below, this script will not work.
        </div>
        <br />
        <div id="imageContainer">
          <img id="imgTest" className="fixedImg" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg/220px-An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg" alt="Testing whether internet connection exists or not. No internet means script will fail" />
          <br /><br />
          <p id="progress">Progress will display here with current image link in the process below</p>
          <a id="imgLinkTest" href="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg/220px-An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg" atl="download link">https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg/220px-An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg</a>
        </div>
        <br />
        <hr></hr>
        <div id="start-process">
          To start this script, fill the two following inputs for which organism and how many papers you wish to scrape through. If you wish to parse through the maximum number of papers available, input the name of the species that you are interested in and press the "Search species for max papers?" button which will autofill the rest of the information for you. Please note that organism requires full name (case insensitive though).
          <br /><br />
          The "Index range" suggests how many papers you want to be parsed and scrapped at once (it will automatically go to the next range of publications when the indicated range is completed). This scrapper will only scrape through open access or publicly available publications and will not be able to access publications locked behind a paywall.
          <br /><br />
          The images are downloaded to your local download location that is designated by your browser you decide to run this tool on.
          <br /><br />
          The default suggested run values if you are doing this for the first time be '<i>Arabidopsis thaliana</i>' (case insensitive, don't worry) and '100'. These are also the values that will run if no input has been put in.
        <br />
        <br />
          Organism: <input id="organism" placeholder="Arabidopsis thaliana" type="text" pattern="[a-zA-Z]"></input> - <button onClick={this.findMaxSpecies}>Search species for max papers?</button>
          <br />
          Max papers: <input id="retmax" placeholder="100" type="number"></input>
          <br />
          Index range: <input id="indexRange" placeholder="100" type="number"></input>
          <br /><br />
          <button id="startScrapping" onClick={this.handleClick}>Start scrapping</button>
        </div>
        <div id="imageHolder">
          
        </div>
      </div>
    );
  }
}