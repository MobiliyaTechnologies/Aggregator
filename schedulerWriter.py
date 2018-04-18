
import sys
import sched
import datetime
import os
import cv2
import time
from datetime import datetime as dt
import json
import requests

def now_str():
    """Return hh:mm:ss string representation of the current time."""
    t = dt.now().time()
    return t.strftime("%H:%M:%S")
def read_in():
    lines = sys.stdin.readlines()
    # Since our input would only be having one line, parse our JSON data from that
    return json.loads(lines[0])

def main():
    def writeVideo(message):
        print (lines)
        # print (type(lines))
        # print time.time()
        streamingUrl = lines[0]
        camId = lines[1]
        duration = int(lines[2])
        aggregatorUrl = lines[8]

        timestamp =  str(int(round(time.time() * 1000)))
        fileName = lines[10]
        FILE_OUTPUT = "./"+ fileName+'.avi'

        # Checks and deletes the output file
        # You cant have a existing file or it will through an error
        if os.path.isfile(FILE_OUTPUT):
            os.remove(FILE_OUTPUT)

        # Playing video from file:

        # Capturing video from webcam:
        cap = cv2.VideoCapture(streamingUrl)
        # Get current width of frame
        width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)   # float
        # Get current height of frame
        height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT) # float

        # Define the codec and create VideoWriter object
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(FILE_OUTPUT,fourcc, 20.0, (int(width),int(height)))
        # if cap.isOpened():
        #     print "cap opened"
        t_end = time.time() + duration * 60
        # startTime = time.time()
        while time.time() < t_end:
                if cap.isOpened():
                    # Capture frame-by-frame
                    ret, frame = cap.read()

                    if ret == True:
                        out.write(frame)
                    else:
                        break
                # if startTime + duration < time.time():
                #     break

        # When everything done, release the capture
        cap.release()
        out.release()

        headers = {'content-type': 'application/json'}
        my_data = {"fileName": fileName, "filePath":FILE_OUTPUT, "callbackUrl" :lines[9]}

        # get_data = f.post(URL, )

        r = requests.post(aggregatorUrl,timeout=30, data=json.dumps(my_data),headers=headers)
        #r.status_code
    lines = read_in()
    year = lines[3]
    month = lines[4]
    date = lines[5]
    hour = lines[6]
    minute = lines[7]
    # Build a scheduler object that will look at absolute times
    scheduler = sched.scheduler(time.time, time.sleep)
    print 'START:', now_str()
    # Put task for today at 7am on queue. Executes immediately if past 7am
    first_time = datetime.datetime(int(year),int(month),int(date),int(hour),int(minute))

    scheduler.enterabs(time.mktime(first_time.timetuple()), 1,
                       writeVideo, ('Running',))
    scheduler.run()

if __name__ == '__main__':
    main()
