import Toast from 'react-native-toast-message';

export const showToast = {
    success: (message: string, description?: string) => {
        Toast.show({
            type: 'success',
            text1: message,
            text2: description,
            position: 'top',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
        });
    },
    
    error: (message: string, description?: string) => {
        Toast.show({
            type: 'error',
            text1: message,
            text2: description,
            position: 'top',
            visibilityTime: 4000,
            autoHide: true,
            topOffset: 50,
        });
    },
    
    info: (message: string, description?: string) => {
        Toast.show({
            type: 'info',
            text1: message,
            text2: description,
            position: 'top',
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
        });
    },
    
    warning: (message: string, description?: string) => {
        Toast.show({
            type: 'warning',
            text1: message,
            text2: description,
            position: 'top',
            visibilityTime: 3500,
            autoHide: true,
            topOffset: 50,
        });
    },
    hide: () => {
        Toast.hide();
    },
};