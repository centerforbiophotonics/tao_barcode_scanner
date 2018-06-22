import React, { Component } from 'react';
import './App.css';

import Select from 'react-select';
import 'react-select/dist/react-select.css';

import { FormControl, Grid, Row, Col, Button } from 'react-bootstrap';

import { library } from '@fortawesome/fontawesome-svg-core'
import {faLock, faLockOpen, faSignInAlt, faSignOutAlt, faWifi} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

library.add( faLock, faLockOpen, faSignInAlt, faSignOutAlt, faWifi )


class App extends Component {
  constructor(props){
    super(props);

    this.handleWorkshopChange = this.handleWorkshopChange.bind(this);
    this.postAttend = this.postAttend.bind(this);
    this.loadWorkshops = this.loadWorkshops.bind(this);
    this.checkScan = this.checkScan.bind(this);
    this.handleScan = this.handleScan.bind(this);
    this.handleLock = this.handleLock.bind(this);
    this.handlePasswordKeyDown = this.handlePasswordKeyDown.bind(this);
    this.handleScanActionChange = this.handleScanActionChange.bind(this);
    this.checkedInNames = this.checkedInNames.bind(this);

    this.state = {
      workshops: [],
      data_loaded: false,
      selected_workshop: null,
      attendees: {},
      check_in: true,
      current_scan_val: "",
      tamper_lock: false,
      unlocking: false,
      password: "",
      error: null,
      current_message:"",
      current_message_color: "green"
    }

    this.scan_timeout = null;
  }

  handleWorkshopChange(e){
    this.setState(prevState => {
      prevState.selected_workshop = e.value;

      if (!(e.value in prevState.attendees)){
        prevState.attendees[e.value] = [];
      }

      return prevState;
    });
  }

  postAttend(workshop_id, attendee_id){
    fetch("http://localhost:3001/tao/attend", {
        method: 'post',
        body: JSON.stringify({workshop_id: workshop_id, attendee_id:attendee_id})
      }).then(res => res.json())
        .then(
          (result) => {
            this.setState(prevState => {

              prevState.attendees[workshop_id].push(attendee_id);

              let checked_in_names = prevState.workshops
                .find(w => {return w.id === prevState.selected_workshop}).registrants
                .filter(r => {return prevState.attendees[prevState.selected_workshop].includes(r.id)})
                .map(r => r.name);

              let last_checked_in = checked_in_names[checked_in_names.length-1]

              
              prevState.current_scan_val = "";
              prevState.error = null;
              prevState.current_message = "Welcome "+last_checked_in;
              prevState.current_message_color = "green";
              return prevState;
            });
          },
          (error) => {
            this.setState({
              error:error
            });
          }
        )
  }

  loadWorkshops(handler){
    fetch("http://localhost:3001/tao/workshops")
        .then(res => res.json())
        .then(
          (result) => {
            this.setState({
              data_loaded: true,
              workshops: result,
              error: null
            }, handler);
          },
          (error) => {
            this.setState({
              error:error
            });
          }
        )
  }

  checkScan(){
    let workshop_registrants = this.state.workshops.find(w => {return w.id === this.state.selected_workshop }).registrants.map((r) => { return r.id});
    let attendee_id = parseInt(this.state.current_scan_val, 10);
    if (workshop_registrants.includes(attendee_id)){
      this.postAttend(this.state.selected_workshop, attendee_id);  
    } else {
      // Refresh workshop data in case attendee was just registered
      this.loadWorkshops(() => {
        let workshop_registrants = this.state.workshops.find(w => {return w.id === this.state.selected_workshop }).registrants.map((r) => { return r.id});
        let attendee_id = parseInt(this.state.current_scan_val, 10);

        if (workshop_registrants.includes(attendee_id)){
          this.postAttend(this.state.selected_workshop, attendee_id);  
        } else {
          this.setState(
            {
              current_scan_val: "", 
              current_message:"You aren't registered for this workshop.", 
              current_message_color:"red"
            }
          );
        }
      });
    }
  }

  handleScan(e){
    if (e.key !== "Meta"){
      this.setState(prevState => {       
        prevState.current_scan_val = prevState.current_scan_val+e.key;
        
        clearTimeout(this.scan_timeout);
        this.scan_timeout = setTimeout(this.checkScan, 50)
        return prevState;
      });
    }
  }

  handleLock(e){
    if (this.state.tamper_lock){
      this.setState({unlocking:true});
      document.removeEventListener("keydown", this.handleScan, false);
    } else {
      if (this.state.selected_workshop !== null){
        this.setState({tamper_lock:true});
        document.addEventListener("keydown", this.handleScan, false);
      } else {
        alert("You must select a workshop.")
      }
    }
  } 

  handlePasswordKeyDown(e){
    if(e.key === 'Enter'){
      if (this.state.password === "ceetao"){
        this.setState({password: "", tamper_lock:false, unlocking:false})
        document.removeEventListener("keydown", this.handleScan, false);
      } else {
        this.setState({password: "", unlocking:false})
        document.addEventListener("keydown", this.handleScan, false);
      }
    } else {
      this.setState({password: e.target.value});
    }
  } 

  handleScanActionChange(e){
    this.setState(prevState => {
      prevState.check_in = !prevState.check_in;
      return prevState;
    });
  }

  checkedInNames(){
    return this.state.workshops
      .find(w => {return w.id === this.state.selected_workshop}).registrants
      .filter(r => {return this.state.attendees[this.state.selected_workshop].includes(r.id)})
      .map(r => r.name)
  }

  render() {

    if (this.state.unlocking){
      return (
        <Grid>
          <Row>
            <Col md={8} mdOffset={2}>
              <h1>Enter Password</h1>
              <FormControl id="password" label="Password" type="password" onKeyUp={this.handlePasswordKeyDown}/>
            </Col>
          </Row>
        </Grid>
      );
    }

    if (this.state.data_loaded){
      let workshop_select_options = this.state.workshops.map(w =>{
        return (
          {
            label: w.name,
            value: w.id
          } 
        )
      });


      let selected_workshop_name = this.state.selected_workshop != null ? 
        this.state.workshops.find(w => {return w.id === this.state.selected_workshop}).name
        :
        "None";

      let selected_workshop_checked_in = this.state.selected_workshop != null ?
        this.checkedInNames()
        :
        null


      return (
        <Grid>
          <Row>
            <Col md={8} mdOffset={2}>
              <h1> TAO Workshop Attendance Scanner </h1>
              
              <Row style={{marginBottom:"5px"}}>
                <Col md={9}>
                  {this.state.tamper_lock === false ? 
                    <Select 
                      className="workshops"
                      placeholder="Select a Workshop" 
                      options={workshop_select_options} 
                      value={this.state.selected_workshop}
                      onChange={this.handleWorkshopChange}
                    />
                    :
                    <h3 style={{marginTop:"5px"}}>{this.state.check_in ? "Checking in to" : "Checking out of"} {selected_workshop_name} </h3>
                  }
                </Col>

                <Col md={3}>
                  <Button bsSize="large" style={{color:"black", float:"right"}} onClick={this.handleLock}>
                    {this.state.tamper_lock ? 
                      <FontAwesomeIcon icon="lock-open"/>
                      : 
                      <FontAwesomeIcon icon="lock"/>
                    }
                  </Button>

                  {this.state.tamper_lock === false ? 
                    <Button bsSize="large" style={{color:"black", float:"right", marginRight:"5px"}} onClick={this.handleScanActionChange}>
                      {this.state.check_in ? 
                        <FontAwesomeIcon icon="sign-in-alt"/>
                        : 
                        <FontAwesomeIcon icon="sign-out-alt"/>
                      }
                    </Button>
                    :
                    null
                  }
                </Col>
              </Row>

              {this.state.tamper_lock ?
                <div>
                  <h2 style={{color:this.state.current_message_color}}>{this.state.current_message}</h2>
                </div>
                :
                <div>
                  <h2>Attendance List:</h2>
                  <p>{selected_workshop_checked_in}</p>
                </div>
              }
             
            </Col>
            <Col md={2}>
              {this.state.error !== null ?
                <FontAwesomeIcon icon="wifi" style={{color:"red"}} />
                :
                null
              }
            </Col>
          </Row>
        </Grid>
      );
    } else {
      return (
        <h1> Loading </h1>
      );
    }
    
  }

  ///selected_workshop_checked_in[selected_workshop_checked_in.length-1]
  componentDidMount(){
    if (!this.state.data_loaded){
      this.loadWorkshops()
    }
  }
}

export default App;
