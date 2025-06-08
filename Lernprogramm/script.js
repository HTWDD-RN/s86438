"use strict";

document.addEventListener('DOMContentLoaded', function(){
    let m = new Model();
    let p = new Presenter();
    let v = new View(p);

    p.setModelAndView(m, v);
    p.start();
});


// ------------------------------- Model -----------------------------
class Model{
    constructor(){
        this.username = "joh.dd14@gmail.com";
        this.password = "81726354";
        this.url = "https://idefix.informatik.htw-dresden.de:8888/api/quizzes/"
    }


    async getTask(quizId){
        const getUrl = this.url + quizId;

        //const controller = new AbortController();

        const getHeader = new Headers();
        getHeader.set("Authorization", "Basic " + btoa(this.username + ":" + this.password));

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(getUrl, {method: "GET", headers: getHeader, signal: controller.signal});
            if (!response.ok) {throw new Error(`Response status: ${response.status}`);}

            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error(error.message);
            return null;
        }
    }
    async postAnswer(quizId, answer){
        const postUrl = this.url + quizId + "/solve";

        const postHeader = new Headers();
        postHeader.set("Authorization", "Basic " + btoa(this.username + ":" + this.password));
        postHeader.set("Content-Type", "application/json");

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(postUrl, {method: "POST", headers: postHeader, body: JSON.stringify([answer]), signal: controller.signal});
            if (!response.ok) {throw new Error(`Response status: ${response.status}`);}

            clearTimeout(id);

            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error(error.message);
            return null;
        }
    }

    async getJson(){
        let response = await fetch('./tasks.json');
        const data = await response.json();

        console.log(data);
        return data;
    }
}


// ------------------------------- Presenter --------------------------
class Presenter{
    setModelAndView(m, v){
        this.m = m;
        this.v = v;
        this.category = "mathe";
    }

    start(){
        document.getElementById(this.category).click();
    }

    async getTaskSet(){
        let startId;
        let endId;

        let task_set = [];

        let abort = false;

        this.v.showLoading();

        this.v.block_task_choice = true;
        this.v.block_new_task = true;

        if(this.category === "allgemein"){
            startId = 1082;
            endId = 1091;

            for(let id = startId; id <= endId; id++){
                let task = await this.m.getTask(id);
                if(!task){
                    abort = true;
                    break;
                }
                
                task_set.push(task);
                console.log(task);
            }
        }

        else{
            const data = await this.m.getJson();

            if(this.category === "mathe") task_set = data.mathe;
            if(this.category === "noten") task_set = data.noten;
            if(this.category === "web") task_set = data.web;
        }

        console.log(task_set);


        this.v.block_task_choice = false;
        this.v.block_new_task = false;

        if(!abort){
            const shuffled_task_set = task_set.sort((a, b) => 0.5 - Math.random());

            console.log(shuffled_task_set);
            
            this.task_set = [];
            for(let i = 0; i < 10 && i < task_set.length; i++){
                this.task_set.push(shuffled_task_set[i]);
            }
            this.current_task_nr = 0;

            this.statistic = [];
            for(let i = 0; i < this.task_set.length; i++){
                this.statistic.push("🚫");
            }

            this.v.showTask(this.task_set[this.current_task_nr], this.current_task_nr + 1, this.category);
        }
        else{
            alert("Fragen konnten nicht geladen werden. Bitte eine andere Kategorie wählen oder mit dem HTWD-Server verbinden.");
            document.getElementById("question").innerHTML = "Laden fehlgeschlagen.<br/><br/>"
        }
    }



    getNewTask(){
        if(this.task_set){
            this.current_task_nr++;
            if(this.task_set[this.current_task_nr]){
                this.v.showTask(this.task_set[this.current_task_nr], this.current_task_nr + 1, this.category);

                if(!this.task_set[this.current_task_nr + 1]){ // Aktuelle Task ist letzte Task im Set
                    this.v.action = 1;
                    document.getElementById("new-task-button").innerHTML = "Statistik";
                }
            }
            else this.current_task_nr--;
        }
    }

    async evaluate(answer){
        console.log("Presenter -> Antwort: " + answer);

        this.v.block_new_task = true;

        if(this.category === "allgemein"){
            const json = await this.m.postAnswer(this.task_set[this.current_task_nr].id, answer);
            if(!json) return false;
            
            if(json.success) this.updateProgress(1);
            else this.updateProgress(0);

            this.v.block_new_task = false;

            return json.success;
        }
        else{
            if(answer === 0) this.updateProgress(1);
            else this.updateProgress(0);

            this.v.block_new_task = false;

            return answer === 0;
        }
    }

    updateProgress(success){
        if(success == 1){
            this.statistic[this.current_task_nr] = "✅";
        } else if(success == 0){
            this.statistic[this.current_task_nr] = "❌";
        }
        this.v.liveStatistic(this.statistic, this.current_task_nr);
        
        let width = parseInt((this.current_task_nr+1) / this.task_set.length * 100);
        this.v.setProgress(width);
    }

    showStatistic(){
        this.v.showStatistic(this.statistic, this.task_set, this.category);
    }

    setTask(type){
        console.log("Presenter -> Aufgabenwahl: " + type);
        this.category = type;
    }
}


// -------------------------------- View ------------------------------
class View {
    constructor(p) {
        this.p = p;  // Presenter
        this.darkMode = true;
        this.setHandler();
        this.pressed = false;
        this.task_choice = null;
        this.statistic = false;
        this.action = 0;
        this.block_task_choice = false;
        this.block_new_task = false;
    }

    setHandler() {
        // use capture false -> bubbling (von unten nach oben aufsteigend)
        // this soll auf Objekt zeigen -> bind (this)
        document.getElementById("answer-buttons").addEventListener("click", this.evaluate.bind(this), false);
        document.getElementById("new-task-button").addEventListener("click", this.newTask.bind(this));
        document.getElementById("task-choice").addEventListener("click", this.taskChoice.bind(this));

        document.querySelectorAll("#answer-buttons > *")[0].setAttribute("number", 0);
        document.querySelectorAll("#answer-buttons > *")[1].setAttribute("number", 1);
        document.querySelectorAll("#answer-buttons > *")[2].setAttribute("number", 2);
        document.querySelectorAll("#answer-buttons > *")[3].setAttribute("number", 3);
    }

    taskChoice(event){
        if(event.target.nodeName.toLowerCase() === "button" && event.target.id != this.task_choice && !this.block_task_choice){
            console.log("Aufgabenwahl: " + event.target.type);

            this.menu_color = event.target.style.backgroundColor;
            this.font_weight = event.target.style.fontWeight;
            if(this.task_choice != null){
                if(this.darkMode) document.getElementById(this.task_choice).style.backgroundColor = this.menu_color;
                else document.getElementById(this.task_choice).style.backgroundColor = "--light-menu";

                document.getElementById(this.task_choice).style.fontWeight = this.font_weight;
            }

            this.task_choice = event.target.id;
            if(this.darkMode) document.getElementById(this.task_choice).style.backgroundColor = "#328787";
            else document.getElementById(this.task_choice).style.backgroundColor = "--light-menu-active";
            document.getElementById(this.task_choice).style.fontWeight = "bold";

            console.log("set color of \"" + this.task_choice + "\"");
            this.p.setTask(event.target.id);
            
            this.action = 2;
            document.getElementById("new-task-button").click();
        }
    }

    showTask(data, nr, category){
        console.log(data);

        console.log("show Task: " + nr);

        let text = "";
        if(category === "allgemein") text = data.text;
        else text = data.a;

        let answers = [];
        if(category === "allgemein") answers = data.options;
        else answers = data.l;

        console.log("Task: " + text);

        document.getElementById("task").innerHTML = "Aufgabe " + nr;

        console.log(answers);

        let answer_order = [0, 1, 2, 3];
        answer_order = answer_order.sort((a, b) => 0.5 - Math.random());

        if(category === "mathe"){

            document.getElementById("answer-button_0").innerHTML = answers[answer_order[0]];
            document.getElementById("answer-button_1").innerHTML = answers[answer_order[1]];
            document.getElementById("answer-button_2").innerHTML = answers[answer_order[2]];
            document.getElementById("answer-button_3").innerHTML = answers[answer_order[3]];

            let b0 = document.getElementById("answer-button_0");
            let b1 = document.getElementById("answer-button_1");
            let b2 = document.getElementById("answer-button_2");
            let b3 = document.getElementById("answer-button_3");
            renderMathInElement(b0, {delimiters: [{left: "$", right: "$", display: false}], throwOnError: false});
            renderMathInElement(b1, {delimiters: [{left: "$", right: "$", display: false}], throwOnError: false});
            renderMathInElement(b2, {delimiters: [{left: "$", right: "$", display: false}], throwOnError: false});
            renderMathInElement(b3, {delimiters: [{left: "$", right: "$", display: false}], throwOnError: false});


            document.getElementById("question").innerHTML = text + "<br/><br/>";

            let quest = document.getElementById("question");
            renderMathInElement(quest, {delimiters: [{left: "$", right: "$", display: false}], throwOnError: false});
        }
        else{
            document.getElementById("answer-button_0").innerHTML = answers[answer_order[0]];
            document.getElementById("answer-button_1").innerHTML = answers[answer_order[1]];
            document.getElementById("answer-button_2").innerHTML = answers[answer_order[2]];
            document.getElementById("answer-button_3").innerHTML = answers[answer_order[3]];

            document.getElementById("question").innerHTML = text + "<br/><br/>";
        }
        
        document.getElementById("answer-button_0").setAttribute("number", answer_order[0]);
        document.getElementById("answer-button_1").setAttribute("number", answer_order[1]);
        document.getElementById("answer-button_2").setAttribute("number", answer_order[2]);
        document.getElementById("answer-button_3").setAttribute("number", answer_order[3]);

        this.loading = false;
        this.pressed = false;
    }
    showLoading(){
        this.loading = true;
        document.getElementById("task").innerHTML = "...";

        document.getElementById("question").innerHTML = "Wird geladen.<br/><br/>"

        document.getElementById("answer-button_0").innerHTML = "...";
        document.getElementById("answer-button_1").innerHTML = "...";
        document.getElementById("answer-button_2").innerHTML = "...";
        document.getElementById("answer-button_3").innerHTML = "...";
    }
    liveStatistic(statistic, current_task_nr){
        let curr_statistic = "";
        for(let i = 0; i <= current_task_nr; i++){
            curr_statistic += (i+1) + ": " + statistic[i] + "<br/>";
        }
        document.getElementById("live-statistic").innerHTML = curr_statistic;
    }



    setProgress(width){
        document.getElementById("progress-text").innerHTML = width + "%";
        document.getElementById("progress").style.width = width + "%";
    }

    async evaluate(event){
        console.log("View -> Evaluate: " + event.type + " " + event.target.nodeName);

        if(event.target.nodeName.toLowerCase() === "button" && !this.pressed && !this.loading && !this.statistic){
            let success = await this.p.evaluate(Number(event.target.attributes.getNamedItem("number").value));
            //-----------------------------------------------------------------------------------------
            this.color = event.target.style.backgroundColor;
            this.pressed_button = event.target.id;
            this.pressed = true;
            console.log("set color: " + event.type + " Color: " + this.color);
            if(success){
                event.target.style.backgroundColor = "#269200";
            }
            else event.target.style.backgroundColor = "#ad0a0a";
        }
    }

    newTask(event){
        document.getElementById("answer-button_0").style.backgroundColor = this.color;
        document.getElementById("answer-button_1").style.backgroundColor = this.color;
        document.getElementById("answer-button_2").style.backgroundColor = this.color;
        document.getElementById("answer-button_3").style.backgroundColor = this.color;

        if(this.block_new_task) return;
        if(this.action === 0){
            this.statistic = false;
            if(this.pressed && !this.loading){
                console.log("new-task: " + event.type + " Color: " + this.color);
                // mit getElementById alle buttons zurücksetzen
                console.log("ID: " + this.pressed_button);
                document.getElementById(this.pressed_button).style.backgroundColor = this.color;
                this.pressed = false;
            }
            if(!this.loading) this.p.updateProgress(-1);
            
            this.p.getNewTask();
        }
        else if(this.action === 1){
            this.action = 2;

            this.p.updateProgress(-1);
            this.p.showStatistic();
        }
        else if(this.action === 2){
            this.action = 0;
            
            this.statistic = false;

            document.getElementById("question-container").style.display = "block";
            document.getElementById("statistic").style.display = "none";

            document.getElementById("progress-text").innerHTML = "0%";
            document.getElementById("progress").style.width = "0%";

            document.getElementById("live-statistic").innerHTML = "";

            this.p.getTaskSet();

            document.getElementById("new-task-button").innerHTML = "Neue Frage";
        }
    }
    showStatistic(statistic, task_set, category){
        this.statistic = true;

        document.getElementById("question-container").style.display = "none";
        document.getElementById("statistic").style.display = "block";

        let statistic_str = "";
        for(let i = 0; i < task_set.length; i++){
            if(category === "allgemein"){
                let text = String(task_set[i].text);
                text = text.replaceAll("<br/>", ", ");
                statistic_str += (i + 1) + ": " + statistic[i] + " " + text + "<br/>";
            }
            else{
                let text = String(task_set[i].a);
                text = text.replaceAll("<br/>", ", ");
                statistic_str += (i + 1) + ": " + statistic[i] + " " + text + "<br/>";
            }
        }
        statistic_str += "<br/>Richtig beantwortet: ✅<br/>Falsch beantwortet: ❌<br/>Nicht beantwortet: 🚫";

        document.getElementById("statistic").innerHTML = statistic_str;

        if(category === "mathe"){
            let stat = document.getElementById("statistic");
            renderMathInElement(stat, {delimiters:[{left: "$", right: "$", display: false}], throwOnError: false});
        }
        

        document.getElementById("new-task-button").innerHTML = "Neue Runde";
        
        return;
    }
}
