/* eslint-disable no-loop-func */
import React from 'react';
const rp = require('request-promise');

/**
 * Retrieves data from PubMed on publications available based on an organism and scrape the figures from those publications
 */
export default class RetrieveData extends React.Component {
    constructor(props) {
        super(props);
        /** Name of the species being queried */
        this.organism = '';
        /** Maximum number of publications being scraped */
        this.retmax = 0;
        /** Range of publications being scraped at once */
        this.indexRange = 0;
        /** Current position within this.indexRange being scraped */
        this.indexPos = 0;
        /** Maximum number of papers available for a species, designated using RetrieveData.retrieveMaxPaperCount() */
        this.maxPapers = 0;
        /** List of PubMed and PMC publication IDs that are being scraped through */
        this.pubmedIDList = [];
        this.pmcIDList = [];
    };

    /**
     * Retrieves information about the publications
     * @param {String} organism The name of the organism 
     * @param {Number} retmax The maximum number of publications that you wish to scrape through, in order of most recent publications date
     * @param {Number} indexRange The range of publications that will be parsed and scrapped
     * @param {Number} indexPos The position of the range index based on the list of publications
     */
    ncbiArticleInfo(organism = 'Arabidopsis_thaliana', retmax = 100, indexRange = 100, indexPos = 0) {
        // Create defaults if invalid inputs were inserted
        if (organism === '') {
            organism = 'Arabidopsis_thaliana'
        } else {
            organism = organism.trim().split(' ').join('_');
        };

        if (retmax === '' || retmax === 0 || isNaN(retmax)) {
            retmax = 100;
        };
        
        if (indexRange === '' || indexRange === 0 || isNaN(indexRange)) {
            indexRange = 100;
        };

        // Redeclare variables
        this.organism = organism;
        this.retmax = retmax;
        this.indexRange = indexRange;
        this.indexPos = indexPos;

        const xhr = new XMLHttpRequest();

        let db = 'pubmed';
        let pubList = [];

        let base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
        let url = base + 'esearch.fcgi?db=' + db + '&term=' + organism + '[Organism]&usehistory=y&retmax=' + retmax;

        xhr.responseType = 'document';
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                let response = xhr.responseXML;
                document.getElementById('progress').innerHTML = 'Starting scraping';
                document.getElementById('titleOfPage').innerHTML = 'Starting scraping';

                // Create a list of PMC publication IDs
                let tempList = [];
                if (response && response.getElementsByTagName('IdList')[0]) {
                    tempList = response.getElementsByTagName('IdList')[0]['innerHTML'].trim().split('\n');
                    for (var i = 0; i < tempList.length; i++) {
                        pubList.push(tempList[i].replace('<Id>', '').replace('</Id>', ''));
                    };
                };

                var indexMax = indexPos + indexRange;
                this.pubmedIDList = [];
                for (var r = indexPos; r < indexMax; r++) {
                    if (pubList[r]) {
                        this.pubmedIDList.push(pubList[r].trim());
                    };
                };
                console.log('pubmedIDList', this.pubmedIDList);

                if (this.pubmedIDList !== [] || this.pubmedIDList.length === 0) {
                    this.retrieveArticleInfo(this.pubmedIDList);
                };
            };
       };

       xhr.open('GET', url, true);
       xhr.send();
    };

    async retrieveArticleInfo(pubMedIDList) {
        const xhr = new XMLHttpRequest();

        let db = 'pubmed';

        let base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
        let url = base + 'efetch.fcgi?db=' + db + '&id=[' + pubMedIDList + ']&retmode=xml';

        xhr.responseType = 'document';
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                let response = xhr.responseXML;
                document.getElementById('progress').innerHTML = 'Retrieving article information';
                document.getElementById('titleOfPage').innerHTML = 'Retrieving article information';

                // Create a list of PMC publication IDs
                if (response && response.querySelectorAll('[IdType="pmc"]')) {
                    let pmcList = response.querySelectorAll('[IdType="pmc"]');
                    for (var i = 0; i < pmcList.length; i++) {
                        if (pmcList[i]['innerHTML']) {
                            this.pmcIDList.push(pmcList[i]['innerHTML']);
                        };
                    };
                };

                console.log('pmcIDList', this.pmcIDList);

                if (this.pmcIDList === [] || this.pmcIDList.length === 0 || this.pmcIDList === undefined) {
                    moveToNextIndexRange(this.organism, this.retmax, this.indexRange, this.indexPos);
                } else {
                    this.retrieveFigures(this.pmcIDList);
                };
            };
       };

       xhr.open('GET', url, true);
       xhr.send();
    };

    /**
     * Retrieve figures from the publication in the the list provided in pmcIDList
     * @param {Array} pmcIDList A list of PMC publication IDs that will be scraped through to retrieve figures from, a default one of '31307397' is provided for manual testing purposes
     */
    async retrieveFigures(pmcIDs = this.pmcIDList) {
        document.getElementById('progress').innerHTML = 'Starting to retrieve figures';
        document.getElementById('titleOfPage').innerHTML = 'Starting to retrieve figures';
        console.log('Starting to retrieve figures');

        var totalCount = 0;
        
        for (var i = 0; i < pmcIDs.length; i++) {
            let url = 'http://localhost:8080/https://www.ncbi.nlm.nih.gov/pmc/articles/' + pmcIDs[i];
    
            rp(url).then(
                async html => {
                    var figureImg, link;
                    var pubMedURL = url.split('/');
                    var pubMedID = pubMedURL[pubMedURL.length - 1];

                    let doc = new DOMParser().parseFromString(html, 'text/html');
        
                    let imgList = doc.getElementsByClassName('titleshop');
                    for (var t = 0; t < imgList.length; t++) {
                        document.getElementById('progress').innerHTML = 'Figure (titleshop): ' + (t + 1) + ' from: ' + pubMedID;
                        document.getElementById('titleOfPage').innerHTML = 'Figure (titleshop): ' + (t + 1) + ' from: ' + pubMedID;

                        // Go through the publications and see if any figures exist 
                        var imgHeadT = imgList[t];
                        if (imgHeadT.getAttribute('src')) {
                            figureImg = 'https://www.ncbi.nlm.nih.gov/' + imgHeadT.getAttribute('src');

                            // Generate download DOM for the figures
                            link = document.createElement('a');
                            link.className = 'imageToDownload';
                            link.href = figureImg;
                            document.body.appendChild(link);
                        };
                    };

                    imgList = doc.getElementsByClassName('fig-image');
                    for (var fi = 0; fi < imgList.length; fi++) {
                        document.getElementById('progress').innerHTML = 'Figure (fig-image): ' + (fi + 1) + ' from: ' + pubMedID;
                        document.getElementById('titleOfPage').innerHTML = 'Figure (fig-image): ' + (fi + 1) + ' from: ' + pubMedID;

                        // Go through the publications and see if any figures exist 
                        var imgHeadFI = imgList[fi];
                        if (imgHeadFI.getAttribute('src')) {
                            figureImg = 'https://www.ncbi.nlm.nih.gov/' + imgHeadFI.getAttribute('src');

                            // Generate download DOM for the figures
                            link = document.createElement('a');
                            link.className = 'imageToDownload';
                            link.href = figureImg;
                            document.body.appendChild(link);
                        };
                    };

                    imgList = doc.getElementsByClassName('tileshop');
                    for (var fi = 0; fi < imgList.length; fi++) {
                        document.getElementById('progress').innerHTML = 'Figure (tileshop): ' + (fi + 1) + ' from: ' + pubMedID;
                        document.getElementById('titleOfPage').innerHTML = 'Figure (tileshop): ' + (fi + 1) + ' from: ' + pubMedID;

                        // Go through the publications and see if any figures exist 
                        var imgHeadFI = imgList[fi];
                        if (imgHeadFI.getAttribute('src')) {
                            figureImg = 'https://www.ncbi.nlm.nih.gov/' + imgHeadFI.getAttribute('src');

                            // Generate download DOM for the figures
                            link = document.createElement('a');
                            link.className = 'imageToDownload';
                            link.href = figureImg;
                            document.body.appendChild(link);
                        };
                    };
                        
                    totalCount += 1;

                    if (totalCount === pmcIDs.length) {
                        // Begin downloading images
                        console.log('Begin downloading images');

                        document.getElementById('progress').innerHTML = 'Begin downloading images';
                        document.getElementById('titleOfPage').innerHTML = 'Begin downloading images';

                        await iterateFigures(this.indexPos, this.indexRange, this.retmax, this.organism);
                    };
                }
            ).catch(
                function(err) {
                    console.log(err);
                    totalCount += 1;
                }
            );
        };
    };

    /**
     * Retrieve the maximum number of publications available for a species
     * @param {String} species Name of the species/organism that is being scraped for
     */
    async retrieveMaxPaperCount(species = this.organism) {
        if (species.trim().length === 0) { 
            // If no species presented, default to Arabidopsis thaliana or already declared species
            species = this.organism;
        };
        // Correct formatting of the species name
        var speciesUse = species.split('_').join('+');
        speciesUse = speciesUse.split(' ').join('+'); 
        let url = 'http://localhost:8080/https://www.ncbi.nlm.nih.gov/pmc/?term=' + speciesUse + '%5BOrganism%5D';
    
        await rp(url).then(
            html => {
                let doc = new DOMParser().parseFromString(html, 'text/html');
    
                let maxPapersContainer = doc.getElementById('resultcount');
                if (maxPapersContainer && maxPapersContainer.value) {
                    this.maxPapers = parseInt(maxPapersContainer.value.trim());
                };

                return this.maxPapers;
            }
        ).catch(
            function(err) {
                console.log(err);
            }
        );
    };


    init(organism, retmax, indexRange, indexPos) {
        this.ncbiArticleInfo(organism, retmax, indexRange, indexPos);
    };
};

/**
 * Iterate through all available figures and begin downloading them
 * @param {Number} indexPos The current index position of the publications being scraped 
 * @param {Number} indexRange  The maximum range of publications at one time being scraped
 * @param {Number} retmax The maximum number of publications being scraped 
 * @param {String} organism The species that is being scraped
 * @param {Number} currentPos The current position of the recursive function. Recommended to keep to default 
 */
async function iterateFigures(indexPos, indexRange, retmax, organism, currentPos = 0) {
    // All images to be downloaded
    var imagesToDownload = document.getElementsByClassName('imageToDownload');

    if (currentPos < imagesToDownload.length) {
        document.getElementById('progress').innerHTML = 'Downloading image: ' + (currentPos + 1) + '/' + imagesToDownload.length;
        document.getElementById('titleOfPage').innerHTML = 'Downloading image: ' + (currentPos + 1) + '/' + imagesToDownload.length;

        // Download image
        imagesToDownload[currentPos].click();

        // Iterate
        setTimeout(async function() { 
            let waitingAgain = await iterateFigures(indexPos, indexRange, retmax, organism, currentPos + 1);
        }, 250); // Any image that takes longer than 250ms to load will fail to download
    } else if (currentPos >= imagesToDownload.length) {
        // If done iterating and downloading images, do to the next index range of publications
        if ((indexPos + indexRange) < retmax) {
            moveToNextIndexRange(organism, retmax, indexRange, indexPos)
        } else {
            // Do nothing, now complete
            console.log('Done');

            document.getElementById('progress').innerHTML = 'Done';
            document.getElementById('titleOfPage').innerHTML = 'Done';
        };
    };
};

async function moveToNextIndexRange(organism, retmax, indexRange, indexPos) {
    console.log('Moving to next range of publications');

    document.getElementById('progress').innerHTML = 'Moving to next range of publications';
    document.getElementById('titleOfPage').innerHTML = 'Moving to next range of publications';

    var newURL = window.location.origin + window.location.pathname + '?organism=' + organism + '&retmax=' + retmax + '&indexRange=' + indexRange + '&indexPos=' + (indexPos + indexRange);
    window.location.href = newURL;
}