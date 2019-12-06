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
  }

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

    let organism = document.getElementById('organism').value.split(' ').join('-');
    let retmax = parseInt(document.getElementById('retmax').value);
    let indexRange = parseInt(document.getElementById('indexRange').value);
    
    var retrieveData = new RetrieveData();
    retrieveData.init(organism, retmax, indexRange, 0);
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
          <a id="imgLinkTest" href="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg/220px-An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg" atl="download link" target="_blank" rel="noopener noreferrer">https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg/220px-An_up-close_picture_of_a_curious_male_domestic_shorthair_tabby_cat.jpg</a>
        </div>
        <br />
        <hr></hr>
        <div id="start-process">
          To start this script, fill the two following inputs for which organism and how many papers you wish to scrape through. If you wish to parse through the maximum number of papers available, search for your species on <a href="https://www.ncbi.nlm.nih.gov/pubmed" atl="download link" target="_blank" rel="noopener noreferrer">PubMed</a> (for example <a href="https://www.ncbi.nlm.nih.gov/pubmed/?term=ArabIdopsis+thaliana" atl="download link" target="_blank" rel="noopener noreferrer">https://www.ncbi.nlm.nih.gov/pubmed/?term=ArabIdopsis+thaliana</a>) and see how many results appear total or keep the "Max papers" at default. You would see it right above the first results saying "Items: 1 to 20 of #", that # is the max number of papers available. The "Index range" suggests how many papers you want to be parsed and scrapped at once (it will automatically go to the next range of publications when the indicated range is completed). This scrapper will only scrape through open access or publicly available publications and will not be able to access publications locked behind a paywall.
          <br /><br />
          The images are downloaded to your local download location that is designated by your browser you decide to run this tool on.
          <br /><br />
          The default suggested run values if you are doing this for the first time be 'Arabidopsis thaliana' (case insensitive, don't worry) and '100'. These are also the values that will run in no input has been put in.
        <br />
        <br />
          Organism: <input id="organism" placeholder="Arabidopsis thaliana" type="text" pattern="[a-zA-Z]"></input>
          <br />
          Max papers: <input id="retmax" placeholder="100" type="number"></input>
          <br />
          Index range: <input id="indexRange" placeholder="100" type="number"></input>
          <br /><br />
          <button id="startScrapping" onClick={this.handleClick}>Start scrapping</button>
        </div>
      </div>
    )
  }
}