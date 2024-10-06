import React from 'react'

export default function Board() {
    return (
        <div>

            <div class="board">
                {/* <!-- Top Row --> */}
                <div class="space corner go">Go</div>
                <div class="space property">Space 1</div>
                <div class="space property">Space 2</div>
                <div class="space property">Space 3</div>
                <div class="space property">Space 4</div>
                <div class="space property">Space 5</div>
                <div class="space property">Space 6</div>
                <div class="space property">Space 7</div>
                <div class="space property">Space 8</div>
                <div class="space property">Space 9</div>
                <div class="space corner jail">Jail</div>

                {/* <!-- Right Column --> */}
                <div class="space property">Space 10</div>
                <div class="space property">Space 11</div>
                <div class="space property">Space 12</div>
                <div class="space property">Space 13</div>
                <div class="space property">Space 14</div>
                <div class="space property">Space 15</div>
                <div class="space property">Space 16</div>
                <div class="space property">Space 17</div>
                <div class="space property">Space 18</div>
                <div class="space corner free-parking">Free Parking</div>

                {/* <!-- Bottom Row (reversed) --> */}
                <div class="space property">Space 19</div>
                <div class="space property">Space 20</div>
                <div class="space property">Space 21</div>
                <div class="space property">Space 22</div>
                <div class="space property">Space 23</div>
                <div class="space property">Space 24</div>
                <div class="space property">Space 25</div>
                <div class="space property">Space 26</div>
                <div class="space property">Space 27</div>
                <div class="space corner go-to-jail">Go to Jail</div>

                {/* <!-- Left Column (reversed) --> */}
                <div class="space property">Space 28</div>
                <div class="space property">Space 29</div>
                <div class="space property">Space 30</div>
                <div class="space property">Space 31</div>
                <div class="space property">Space 32</div>
                <div class="space property">Space 33</div>
                <div class="space property">Space 34</div>
                <div class="space property">Space 35</div>
                <div class="space property start">Space 36</div>
            </div>


        </div>
    )
}
